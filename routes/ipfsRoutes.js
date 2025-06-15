const express = require("express");
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
const { verifyToken } = require("../jwtMiddleware.js"); // Middleware untuk autentikasi JWT

const router = express.Router();

// Setup multer untuk menangani file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Hanya menerima file dengan tipe image
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Hanya file gambar yang diperbolehkan!"), false);
    }
    cb(null, true);
  },
});

// Fungsi untuk menambahkan file ke IPFS
async function addFileToIPFS(fileBuffer) {
  try {
    console.time("Upload to IPFS Time");
    const form = new FormData();
    form.append("file", fileBuffer, "file");

    const response = await fetch("http://192.168.50.94:5001/api/v0/add", {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    const rawResponse = await response.text();
    console.log("Raw response from IPFS:", rawResponse);

    const result = JSON.parse(rawResponse);

    if (!response.ok) {
      throw new Error("Gagal menambahkan file ke IPFS: " + result.Message);
    }

    const cid = result.Hash;
    console.log(`File berhasil ditambahkan ke IPFS dengan CID: ${cid}`);
    console.timeEnd("Upload to IPFS Time");
    return cid;
  } catch (error) {
    console.error("Gagal menambahkan file ke IPFS:", error.message);
    throw new Error(`Gagal menambahkan file ke IPFS: ${error.message}`);
  }
}

// Endpoint untuk meng-upload file ke IPFS
router.post(
  "/upload",
  verifyToken, // Pastikan hanya pengguna yang terautentikasi yang bisa upload
  upload.single("file"), // Menggunakan multer untuk menangani file upload
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // Pastikan file adalah gambar
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Hanya file gambar yang diperbolehkan!",
        });
      }

      const cid = await addFileToIPFS(req.file.buffer);
      res.status(200).json({
        success: true,
        cid: cid,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Fungsi untuk mengambil file dari IPFS (dibiarkan seperti sebelumnya)
async function getFileFromIPFS(cid) {
  try {
    console.time("Get Image from IPFS Time");
    const form = new FormData();
    form.append("arg", cid);

    const response = await fetch("http://192.168.50.94:5001/api/v0/cat", {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IPFS Error: ${error}`);
    }

    console.timeEnd("Get Image from IPFS Time");
    return await response.buffer();
  } catch (error) {
    console.error("Gagal mengambil file:", error.message);
    throw error;
  }
}

// Endpoint untuk mengambil file dari IPFS
router.get("/getFile/:cid", async (req, res) => {
  const { cid } = req.params;
  try {
    const fileData = await getFileFromIPFS(cid);
    res.set("Content-Type", "application/octet-stream");
    res.send(fileData);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message.includes("not found")
        ? "File tidak ditemukan di IPFS"
        : "Gagal mengambil file",
      cid: cid,
    });
  }
});

module.exports = router; // Ekspor router untuk digunakan
