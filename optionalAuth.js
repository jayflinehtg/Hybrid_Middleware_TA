const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { initialize } = require("./utils/blockchain.js");

dotenv.config();

const optionalAuth = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    // Tidak ada token, lanjutkan sebagai guest
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Ambil publicKey dari token dan pastikan masih login di blockchain
    const { publicKey } = decoded;
    const { contract } = await initialize(publicKey);
    const userInfo = await contract.methods.getUserInfo(publicKey).call();

    if (!userInfo.isLoggedIn) {
      req.user = null; // Guest mode jika tidak login di blockchain
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
