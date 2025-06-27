const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { initialize } = require("./utils/blockchain.js"); // Mengakses fungsi blockchain untuk validasi
dotenv.config();

const verifyToken = async (req, res, next) => {
  // Mengambil token dari header Authorization
  const token = req.header("Authorization")?.replace("Bearer ", "");

  console.log("Token received:", token);

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
    const { contract } = await initialize(publicKey);
    const userInfo = await contract.methods.getUserInfo(publicKey).call();

    console.log("User info from blockchain:", userInfo);

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

    if (error.name === "TokenExpiredError") {
      return handleTokenExpiration(req, res, next);
    }

    return res.status(401).json({
      success: false,
      message: "Token tidak valid",
    });
  }
};

const handleTokenExpiration = async (req, res, next) => {
  try {
    const expiredToken = req.header("Authorization")?.replace("Bearer ", "");
    const decodedExpired = jwt.decode(expiredToken);

    if (!decodedExpired || !decodedExpired.publicKey) {
      return res.status(401).json({
        success: false,
        message: "Token expired dan tidak dapat di-refresh",
      });
    }

    const { publicKey } = decodedExpired; // Mengambil wallet address dari token yang sudah expired

    // cek status di blockchain untuk memastikan user masih login
    const { contract } = await initialize(publicKey);
    const userInfo = await contract.methods.getUserInfo(publicKey).call();

    if (!userInfo.isLoggedIn) {
      return res.status(401).json({
        success: false,
        message: "Sesi telah berakhir, silakan login kembali",
        requireReauth: true,
      });
    }

    const newToken = jwt.sign(
      { publicKey: publicKey },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log(`✅ Token refreshed untuk ${publicKey}`);

    // Set new token di response header
    res.setHeader("X-New-Token", newToken);

    // Set user info untuk request selanjutnya
    req.user = { publicKey };

    next();
  } catch (refreshError) {
    console.error("Error refreshing token:", refreshError);
    return res.status(401).json({
      success: false,
      message: "Gagal refresh token, silakan login kembali",
      requireReauth: true,
    });
  }
};

// Memeriksa apakah token akan expired
const requireFreshToken = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token required untuk operasi ini",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cek apakah token akan expired dalam 30 menit
    const now = Math.floor(Date.now() / 1000);
    const thirtyMinutes = 30 * 60;

    if (decoded.exp - now < thirtyMinutes) {
      return handleTokenExpiration(req, res, next);
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return handleTokenExpiration(req, res, next);
    }
    
    return res.status(401).json({
      success: false,
      message: "Token tidak valid untuk operasi ini",
    });
  }
};

module.exports = { verifyToken, requireFreshToken };
