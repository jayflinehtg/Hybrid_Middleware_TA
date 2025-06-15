const { initialize } = require("../utils/blockchain.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

async function registerUser(walletAddress, fullName, password) {
  try {
    console.time("Registration Time");
    console.log("Wallet Address:", walletAddress);
    console.log("Full Name:", fullName);
    console.log("Password received:", password);

    if (!password || password.trim() === "") {
      throw new Error("Password tidak boleh kosong");
    }

    const { contract } = await initialize(walletAddress);

    // Hash password dengan bcrypt sebelum dikirim ke blockchain
    const salt = await bcrypt.genSalt(10);
    console.log("Generated Salt:", salt);

    const passwordHash = await bcrypt.hash(password, salt);

    // Mengirim data user ke smart contract
    const tx = await contract.methods
      .registerUser(fullName, passwordHash)
      .send({ from: walletAddress, gas: 3000000 });

    console.timeEnd("Registration Time");
    console.log(
      `✅ Pendaftaran berhasil dengan TX Hash: ${tx.transactionHash}`
    );
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error dalam registerUser:", error);
    let errorMessage = "Pendaftaran gagal: Terjadi kesalahan tidak dikenal.";

    // Coba ekstrak pesan error spesifik dari smart contract
    if (error && error.message) {
      // Ini adalah error dari web3.js atau library terkait
      // Contoh: "ContractExecutionError: Error happened while trying to execute a function inside a smart contract"
      // Kita perlu mencari pesan "revert" di dalamnya

      // Cari pesan dari `revert` statement smart contract
      const revertMatch = error.message.match(/revert (.*)/i);
      if (revertMatch && revertMatch[1]) {
        errorMessage = `Pendaftaran gagal: ${revertMatch[1]}`;
      } else if (error.cause && typeof error.cause.message === "string") {
        // Coba cek properti 'cause' jika ada
        const nestedRevertMatch = error.cause.message.match(/revert (.*)/i);
        if (nestedRevertMatch && nestedRevertMatch[1]) {
          errorMessage = `Pendaftaran gagal: ${nestedRevertMatch[1]}`;
        } else {
          // Fallback ke pesan dari 'cause' jika tidak ada 'revert'
          errorMessage = `Pendaftaran gagal: ${error.cause.message}`;
        }
      } else {
        // Fallback jika struktur error tidak sesuai harapan tapi ada error.message
        errorMessage = `Pendaftaran gagal: ${error.message}`;
      }
    } else if (typeof error === "string") {
      // Jika error adalah string sederhana
      errorMessage = `Pendaftaran gagal: ${error}`;
    }

    throw new Error(errorMessage); // Lempar error dengan pesan yang lebih spesifik
  }
}

async function loginUser(walletAddress, password) {
  try {
    console.time("Login Time");
    const { contract } = await initialize(walletAddress);

    // Ambil informasi user dari smart contract
    const userInfo = await contract.methods.getUserInfo(walletAddress).call();
    const storedPasswordHash = userInfo.hashPass; // Hash password yang tersimpan di blockchain

    // Bandingkan password yang diinput dengan hash yang ada di blockchain
    const isMatch = await bcrypt.compare(password, storedPasswordHash);
    if (!isMatch) throw new Error("Password salah");

    // Jika password cocok, user dianggap login dan dapat JWT Token
    const tx = await contract.methods
      .login()
      .send({ from: walletAddress, gas: 3000000 });

    // Buat token JWT yang berlaku selama 3 jam
    const token = jwt.sign(
      { publicKey: walletAddress },
      process.env.JWT_SECRET
    );

    console.timeEnd("Login Time");

    console.log(`✅ Login berhasil! JWT Token: ${token}`);
    return { token, txHash: tx.transactionHash };
  } catch (error) {
    console.error("❌ Error dalam loginUser:", error);
    throw new Error(`Login gagal: ${error.message}`);
  }
}

// Fungsi baru untuk mendapatkan data pengguna
async function getUserData(walletAddress) {
  try {
    const { contract } = await initialize();
    const userInfo = await contract.methods.getUserInfo(walletAddress).call();
    return {
      fullName: userInfo.fullName,
      isRegistered: userInfo.isRegistered,
      isLoggedIn: userInfo.isLoggedIn,
      // Jangan kembalikan hashPass untuk keamanan
    };
  } catch (error) {
    console.error("❌ Error dalam getUserData:", error);
    throw new Error(`Gagal mengambil data pengguna: ${error.message}`);
  }
}

async function logoutUser(token) {
  try {
    console.time("Logout Time");
    if (!token) throw new Error("Token diperlukan untuk logout!");

    // Verifikasi token untuk mendapatkan publicKey
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const publicKey = decoded.publicKey;

    const { contract } = await initialize();

    // Memanggil fungsi logout di smart contract
    const tx = await contract.methods
      .logout()
      .send({ from: publicKey, gas: 3000000 });

    console.timeEnd("Logout Time");
    console.log(`✅ Logout berhasil untuk: ${publicKey}`);
    return tx.transactionHash;
  } catch (error) {
    console.error("❌ Error dalam logoutUser:", error);
    throw new Error(`Logout gagal: ${error.message}`);
  }
}

// Fungsi untuk mengecek status login pengguna
async function isUserLoggedIn(publicKey) {
  const { contract } = await initialize(publicKey); // Inisialisasi kontrak menggunakan publicKey
  const userInfo = await contract.methods.getUserInfo(publicKey).call(); // Ambil informasi pengguna
  return userInfo.isLoggedIn; // Kembalikan status login
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  isUserLoggedIn,
  getUserData,
};
