// =================== BIGINT SERIALIZATION ===================
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes/index.js"); // const router utama
const { initializePublic } = require("./utils/publicBlockchain.js");

// Inisialisasi environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mount router utama dari index.js
app.use("/api", routes);

// Penanganan 404 untuk rute yang tidak terdaftar
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.path}`,
    suggestion: "Endpoint tidak tersedia atau cek path URL",
  });
});

// Penanganan error global
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan pada server",
    error: err.message,
  });
});

// =================== INISIALISASI BLOCKCHAIN ===================
async function initializeBlockchains() {
  try {
    await initializePublic();
    console.log("✅ Public blockchain (Tea Sepolia) berhasil di-inisialisasi");

    console.log("✅ Hybrid blockchain system siap digunakan!");
  } catch (error) {
    console.error("❌ Error initializing blockchains:", error.message);
    // Jangan exit process, biarkan server tetap jalan untuk debugging
    console.log(
      "⚠️  Server tetap berjalan meskipun ada masalah dengan blockchain"
    );
  }
}

// =================== START SERVER ===================
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server berjalan di http://0.0.0.0:${PORT}`);

  await initializeBlockchains();
});

module.exports = app;
