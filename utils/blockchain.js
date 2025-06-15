const dotenv = require("dotenv");
const Web3 = require("web3").Web3;
const fs = require("fs");
const path = require("path");

dotenv.config();

// Path to the compiled contract JSON
const contractPath = path.resolve(
  __dirname,
  "../build/contracts/HerbalPlant.json"
);
const contractJSON = JSON.parse(fs.readFileSync(contractPath, "utf8"));

// Extract ABI and Contract Address
const contractABI = contractJSON.abi;
const contractAddress =
  process.env.SMART_CONTRACT_ADDRESS;

let web3;
let contract;
let initializationPromise = null;

// Fungsi untuk menghubungkan ke blockchain menggunakan RPC URL dari .env
async function connectToBlockchain() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;

  if (!rpcUrl) {
    throw new Error("BLOCKCHAIN_RPC_URL tidak ditemukan di file .env");
  }

  web3 = new Web3(rpcUrl);

  try {
    const chainId = await web3.eth.getChainId();
    console.log(`Connected to blockchain. Chain ID: ${chainId}`);
  } catch (error) {
    console.error("Failed to connect to blockchain", error);
    process.exit(1);
  }
}

async function initialize() {
  // Jika Promise inisialisasi sudah ada, kembalikan Promise tersebut
  if (initializationPromise) {
    return initializationPromise;
  }

  // Buat Promise inisialisasi baru dan simpan
  initializationPromise = (async () => {
    console.log("Memulai inisialisasi blockchain...");

    try {
      await connectToBlockchain();

      // Inisialisasi kontrak
      contract = new web3.eth.Contract(contractABI, contractAddress);

      // Cek apakah kontrak berhasil terinisialisasi
      if (!contract || !contract.methods) {
        throw new Error("Kontrak tidak terhubung dengan benar.");
      }

      console.log("Blockchain berhasil diinisialisasi.");
      return { contract };
    } catch (error) {
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

module.exports = { initialize };
