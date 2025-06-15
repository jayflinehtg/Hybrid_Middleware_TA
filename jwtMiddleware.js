const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { initialize } = require("./utils/blockchain.js"); // Mengakses fungsi blockchain untuk validasi
dotenv.config();

const verifyToken = async (req, res, next) => {
  // Mengambil token dari header Authorization
  const token = req.header("Authorization")?.replace("Bearer ", "");

  console.log("Token received:", token); // Debugging: Menampilkan token yang diterima

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak, token tidak ditemukan",
    });
  }

  try {
    // Memverifikasi token menggunakan JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    console.log("Decoded token:", decoded); // Debugging: Menampilkan token yang terdecode

    // Mendapatkan publicKey (wallet address) dari decoded token
    const { publicKey } = decoded;
    const { contract } = await initialize(publicKey); // Menginisialisasi kontrak menggunakan wallet address
    const userInfo = await contract.methods.getUserInfo(publicKey).call(); // Memeriksa data pengguna di blockchain

    console.log("User info from blockchain:", userInfo); // Debugging: Menampilkan data user dari blockchain

    // Memastikan user telah login di blockchain
    if (!userInfo.isLoggedIn) {
      return res.status(401).json({
        success: false,
        message: "Pengguna tidak terautentikasi di blockchain.",
      });
    }

    // Melanjutkan ke middleware berikutnya jika token valid dan pengguna terautentikasi
    next();
  } catch (error) {
    console.error("Error decoding token:", error);
    return res.status(401).json({
      success: false,
      message: "Token tidak valid atau sudah kedaluwarsa",
    });
  }
};

// Ekspor middleware verifyToken untuk digunakan pada route lain
module.exports = { verifyToken };
