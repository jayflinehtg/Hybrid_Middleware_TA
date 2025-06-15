const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes/index.js"); // const router utama
const { verifyToken } = require("./jwtMiddleware.js"); // Import middleware untuk autentikasi JWT

// Inisialisasi environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PENTING: Mount router utama dari index.js
app.use("/api", routes); // Menambahkan prefix '/api'

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

// =================== START SERVER ===================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
});

module.exports = app;
