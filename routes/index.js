const express = require("express");
const authRoutes = require("./authRoutes.js");
const plantRoutes = require("./plantRoutes.js");
const ipfsRoutes = require("./ipfsRoutes.js");
const { initialize } = require("../utils/blockchain.js");
const { verifyToken } = require("../jwtMiddleware.js"); // Middleware untuk verifikasi token

const router = express.Router();

// Inisialisasi blockchain
let blockchain;
(async () => {
  try {
    blockchain = await initialize(); // Memastikan blockchain sudah terhubung
    console.log("✅ Blockchain berhasil di-inisialisasi");
  } catch (error) {
    console.error("❌ Error initializing blockchain:", error.message);
    process.exit(1);
  }
})();

// Middleware logging untuk melihat request yang masuk
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Rute utama
router.use("/auth", authRoutes);
router.use("/plants", plantRoutes);
router.use("/ipfs", ipfsRoutes);

// Middleware untuk menangani rute yang tidak ditemukan
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Middleware untuk menangani error server dengan lebih baik
router.use((err, req, res, next) => {
  console.error("❌ Internal Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message,
  });
});

module.exports = router;
