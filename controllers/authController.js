const { initialize } = require("../utils/blockchain.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

async function registerUser(walletAddress, fullName, password) {
  try {
    console.time("Prepare Registration TX Data Time");
    console.log("Wallet Address:", walletAddress);
    console.log("Preparing TX data for Full Name:", fullName);
    console.log("Password received for hashing:", password);

    if (!walletAddress || walletAddress.trim() === "") {
      throw new Error("Wallet address tidak boleh kosong");
    }
    if (!fullName || fullName.trim() === "") {
      throw new Error("Nama lengkap tidak boleh kosong");
    }
    if (!password || password.trim() === "") {
      throw new Error("Password tidak boleh kosong");
    }

    // Validasi format wallet address (opsional)
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Format wallet address tidak valid");
    }

    const { contract } = await initialize();

    // CEK APAKAH WALLET SUDAH TERDAFTAR
    console.log("Memeriksa apakah wallet sudah terdaftar...");
    const userInfo = await contract.methods.getUserInfo(walletAddress).call();

    if (userInfo.isRegistered) {
      throw new Error("Anda sudah memiliki akun, silahkan login.");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log("Password hash generated for registration");

    // Buat data transaksi ABI-encoded untuk registerUser(string,string)
    const txObject = contract.methods.registerUser(fullName, passwordHash);
    const transactionDataHex = txObject.encodeABI();

    console.timeEnd("Prepare Registration TX Data Time");
    console.log(
      `✅ TX data (ABI encoded) disiapkan untuk registrasi ${fullName}`
    );

    return {
      transactionData: transactionDataHex,
    };
  } catch (error) {
    console.error("❌ Error dalam persiapan TX data registrasi:", error);
    throw new Error(`Registrasi gagal: ${error.message}`);
  }
}

// Verifikasi Kredensial, Terbitkan JWT, dan Persiapan encodedABI
async function loginUser(walletAddress, password) {
  try {
    console.time("Login Process Time");
    const { contract } = await initialize(walletAddress);

    const userInfo = await contract.methods.getUserInfo(walletAddress).call();
    if (!userInfo.isRegistered) {
      throw new Error("Pengguna belum terdaftar.");
    }
    const storedPasswordHash = userInfo.hashPass;

    const isMatch = await bcrypt.compare(password, storedPasswordHash);
    if (!isMatch) {
      throw new Error("Password salah.");
    }

    // Kredensial valid, terbitkan JWT
    const token = jwt.sign(
      { publicKey: walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Persiapkan encodedABI untuk fungsi login() on-chain
    const { contract: contractInstanceForEncoding } = await initialize();
    const loginTxObject = contractInstanceForEncoding.methods.login();
    const loginTransactionDataHex = loginTxObject.encodeABI();

    console.timeEnd("Login Process Time");
    console.log(
      `✅ Verifikasi kredensial berhasil untuk ${walletAddress}. JWT Token diterbitkan. Data TX login disiapkan.`
    );

    return {
      token,
      userData: {
        fullName: userInfo.fullName,
        isRegistered: userInfo.isRegistered,
      },
      loginTransactionData: loginTransactionDataHex,
    };
  } catch (error) {
    console.error("❌ Error dalam proses loginUser:", error);
    const knownMessages = ["Pengguna belum terdaftar.", "Password salah."];
    if (
      error.message &&
      knownMessages.some((msg) => error.message.includes(msg))
    ) {
      throw new Error(`Login gagal: ${error.message}`);
    }
    throw new Error(
      `Login gagal: Terjadi kesalahan pada server. ${error.message}`
    );
  }
}

// Fungsi getUserData: Tetap sama, hanya membaca data
async function getUserData(walletAddress) {
  try {
    const { contract } = await initialize();
    const userInfo = await contract.methods.getUserInfo(walletAddress).call();
    return {
      fullName: userInfo.fullName,
      isRegistered: userInfo.isRegistered,
      isLoggedIn: userInfo.isLoggedIn,
    };
  } catch (error) {
    console.error("❌ Error dalam getUserData:", error);
    throw new Error(`Gagal mengambil data pengguna: ${error.message}`);
  }
}

// Verifikasi JWT dan Persiapan encodedABI untuk logout on-chain
async function logoutUser(token) {
  try {
    console.time("Server Logout Process Time");
    if (!token) {
      throw new Error("Token diperlukan untuk logout!");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const publicKey = decoded.publicKey;

    const { contract } = await initialize();
    const logoutTxObject = contract.methods.logout();
    const logoutTransactionDataHex = logoutTxObject.encodeABI();

    console.timeEnd("Server Logout Process Time");
    console.log(
      `✅ Permintaan logout server valid untuk: ${publicKey}. Data TX logout disiapkan.`
    );

    return {
      message:
        "Token logout sisi server diproses. Silakan lanjutkan logout on-chain.",
      logoutTransactionData: logoutTransactionDataHex,
      publicKey: publicKey,
    };
  } catch (error) {
    console.error("❌ Error dalam logoutUser (server):", error);
    if (error.name === "JsonWebTokenError") {
      throw new Error(`Logout gagal: Token tidak valid. ${error.message}`);
    }
    if (error.name === "TokenExpiredError") {
      console.log(
        `Permintaan logout diterima untuk token yang sudah kedaluwarsa (${error.message}).`
      );
      try {
        const { contract } = await initialize();
        const logoutTxObject = contract.methods.logout();
        const logoutTransactionDataHex = logoutTxObject.encodeABI();

        return {
          message: "Token sudah kedaluwarsa. Logout tetap dapat dilanjutkan.",
          logoutTransactionData: logoutTransactionDataHex,
          publicKey: null,
        };
      } catch (contractError) {
        throw new Error(
          `Token expired dan gagal menyiapkan data logout: ${contractError.message}`
        );
      }
    }
    throw new Error(`Logout server gagal: ${error.message}`);
  }
}

async function isUserLoggedIn(publicKey) {
  try {
    const { contract } = await initialize(publicKey);
    const userInfo = await contract.methods.getUserInfo(publicKey).call();
    return userInfo.isLoggedIn;
  } catch (error) {
    console.error("❌ Error dalam isUserLoggedIn:", error);
    throw new Error(`Gagal mengecek status login: ${error.message}`);
  }
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  isUserLoggedIn,
  getUserData,
};
