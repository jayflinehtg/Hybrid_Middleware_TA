const dotenv = require("dotenv");
const Web3 = require("web3").Web3;
const fs = require("fs");
const path = require("path");

dotenv.config();

// Path to the compiled PublicRecord contract JSON
const contractPath = path.resolve(
  __dirname,
  "../build/contracts/PublicRecord.json"
);
const contractJSON = JSON.parse(fs.readFileSync(contractPath, "utf8"));

// Extract ABI and Contract Address for Public Network
const contractABI = contractJSON.abi;
const contractAddress = process.env.PUBLIC_SMART_CONTRACT_ADDRESS;

let web3;
let contract;
let account;
let initializationPromise = null;

// Fungsi untuk menghubungkan ke jaringan public (Tea Sepolia)
async function connectToPublicBlockchain() {
  const rpcUrl = process.env.PUBLIC_NETWORK_RPC_URL;
  const privateKey = process.env.PUBLIC_NETWORK_PRIVATE_KEY;

  if (!rpcUrl) {
    throw new Error("PUBLIC_NETWORK_RPC_URL tidak ditemukan di file .env");
  }

  if (!privateKey) {
    throw new Error("PUBLIC_NETWORK_PRIVATE_KEY tidak ditemukan di file .env");
  }

  web3 = new Web3(rpcUrl);

  try {
    const chainId = await web3.eth.getChainId();
    console.log(`Connected to public blockchain. Chain ID: ${chainId}`);

    // Buat account dari private key
    account = web3.eth.accounts.privateKeyToAccount(privateKey);

    // Tambahkan account ke wallet web3
    web3.eth.accounts.wallet.add(account);

    console.log(`Public account initialized: ${account.address}`);
  } catch (error) {
    console.error("Failed to connect to public blockchain", error);
    throw error;
  }
}

async function initializePublic() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    console.log("Memulai inisialisasi public blockchain...");

    try {
      await connectToPublicBlockchain();

      // Inisialisasi kontrak PublicRecord
      contract = new web3.eth.Contract(contractABI, contractAddress);

      if (!contract || !contract.methods) {
        throw new Error("Public contract tidak terhubung dengan benar.");
      }

      console.log("Public blockchain berhasil diinisialisasi.");
      return { contract, web3, account };
    } catch (error) {
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

// Fungsi untuk mengirim transaksi ke jaringan public
async function sendPublicTransaction(methodCall) {
  try {
    const { web3, account } = await initializePublic();

    // Buat transaction object
    const transactionObject = {
      from: account.address,
      to: contractAddress,
      data: methodCall.encodeABI(),
      // Web3 akan otomatis estimate gas dan gasPrice
    };

    console.log("Sending transaction to public network...");

    // Gunakan wallet method untuk mengirim transaksi
    const tx = await web3.eth.sendTransaction(transactionObject);

    console.log(`✅ Public transaction successful: ${tx.transactionHash}`);
    return tx;
  } catch (error) {
    console.error("❌ Error sending public transaction:", error);
    throw error;
  }
}

// Fungsi khusus untuk menambahkan plant record ke jaringan public
async function addPlantRecordToPublic(privateTxHash, plantId, userAddress) {
  try {
    console.time("Add Plant Record to Public Time");
    console.log("Sending transaction to public network...");

    const TIMEOUT_MS = 30000;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Public transaction timeout after 30 seconds")),
        TIMEOUT_MS
      );
    });

    const publicTxPromise = (async () => {
      const { contract } = await initializePublic();

      // Buat method call
      const methodCall = contract.methods.addPlantRecord(
        privateTxHash,
        plantId.toString(),
        userAddress
      );

      const tx = await sendPublicTransaction(methodCall);

      return tx;
    })();

    const tx = await Promise.race([publicTxPromise, timeoutPromise]);

    console.log("✅ Public transaction successful:", tx.transactionHash);
    console.timeEnd("Add Plant Record to Public Time");

    return {
      success: true,
      publicTxHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed,
    };
  } catch (error) {
    console.error(
      "❌ Error adding plant record to public network:",
      error.message
    );

    // error handling dengan timeout info
    if (error.message.includes("timeout")) {
      console.error(
        "❌ Public blockchain timeout - Tea Sepolia might be congested"
      );
    }

    throw error;
  }
}

function convertToNumber(value) {
  if (typeof value === "bigint") {
    // Cek apakah BigInt dalam range Number yang aman
    if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
      return Number(value);
    } else {
      throw new Error(
        `BigInt value ${value} is too large to convert to Number safely`
      );
    }
  }
  return typeof value === "string" ? parseInt(value) : value;
}

// Fungsi untuk Update Plant Record Hash
async function updatePlantRecordHash(recordId, txHash, userPrivateKey = null) {
  try {
    console.log(`📝 Updating plant record hash for recordId: ${recordId}`);

    const { web3, contract } = await initializePublic();

    const privateKey = userPrivateKey || process.env.PUBLIC_NETWORK_PRIVATE_KEY;
    const signerAccount = web3.eth.accounts.privateKeyToAccount(privateKey);

    // Gunakan helper function
    const recordIdNumber = convertToNumber(recordId);

    // Estimate gas untuk updatePlantRecordHash
    const gasEstimate = await contract.methods
      .updatePlantRecordHash(recordIdNumber, txHash)
      .estimateGas({ from: signerAccount.address });

    // Gunakan helper function untuk semua konversi
    const gasEstimateNumber = convertToNumber(gasEstimate);
    const gasPrice = await web3.eth.getGasPrice();
    const gasPriceNumber = convertToNumber(gasPrice);
    const nonce = await web3.eth.getTransactionCount(signerAccount.address);
    const nonceNumber = convertToNumber(nonce);

    // Buat transaksi untuk update record hash
    const tx = {
      to: contractAddress,
      data: contract.methods
        .updatePlantRecordHash(recordIdNumber, txHash)
        .encodeABI(),
      gas: Math.floor(gasEstimateNumber * 1.2),
      gasPrice: gasPriceNumber,
      nonce: nonceNumber,
    };

    // Sign dan kirim transaksi
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(
      signedTx.rawTransaction
    );

    console.log(`✅ Plant record hash updated successfully!`);
    console.log(`📋 Update TX Hash: ${receipt.transactionHash}`);

    return {
      success: true,
      updateTxHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      recordId: recordIdNumber.toString(),
    };
  } catch (error) {
    console.error(`❌ Error updating plant record hash:`, error);
    throw error;
  }
}

// Fungsi untuk mengambil plant record dari jaringan public (read-only)
async function getPlantRecordFromPublic(recordId) {
  try {
    const { contract } = await initializePublic();

    const record = await contract.methods.getPlantRecord(recordId).call();

    return {
      privateTxHash: record.privateTxHash,
      plantId: record.plantId.toString(),
      userAddress: record.userAddress,
      timestamp: record.timestamp.toString(),
    };
  } catch (error) {
    console.error("❌ Error getting plant record from public network:", error);
    throw error;
  }
}

// Fungsi untuk mendapatkan semua record di jaringan public
async function getAllPublicRecords() {
  const { contract } = await initializePublic();
  const count = await contract.methods.recordCount().call();
  const total = parseInt(count.toString());
  const records = [];

  for (let i = 0; i < total; i++) {
    const record = await contract.methods.getPlantRecord(i).call();
    records.push({
      recordId: i.toString(),
      privateTxHash: record.privateTxHash,
      plantId: record.plantId.toString(),
      userAddress: record.userAddress,
      timestamp: record.timestamp.toString(),
    });
  }

  return records;
}

async function getPlantTransactionHistory(plantId, page = 1, limit = 10) {
  try {
    console.log("🔍 [DEBUG] getPlantTransactionHistory called with:", { plantId, page, limit });
    
    const { contract } = await initializePublic();
    console.log("🔍 [DEBUG] Contract initialized successfully");
    
    const totalRecords = await contract.methods.recordCount().call();
    const total = parseInt(totalRecords.toString());
    
    console.log("🔍 [DEBUG] Total records in PublicRecord contract:", total);
    
    if (total === 0) {
      console.log("⚠️ [DEBUG] No records found in PublicRecord contract");
      return {
        records: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalRecords: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Filter records berdasarkan plantId
    const plantRecords = [];

    for (let i = 0; i < total; i++) {
      try {
        const record = await contract.methods.getPlantRecord(i).call();
        console.log(`🔍 [DEBUG] Record ${i}:`, record);

        // Filter hanya record yang sesuai dengan plantId
        if (record.plantId.toString() === plantId.toString()) {
          console.log(`✅ [DEBUG] Found matching record for plantId ${plantId}:`, record);
          plantRecords.push({
            recordId: i.toString(),
            privateTxHash: record.privateTxHash,
            plantId: record.plantId.toString(),
            userAddress: record.userAddress,
            timestamp: record.timestamp.toString(),
          });
        }
      } catch (recordError) {
        console.log(`⚠️ [DEBUG] Error reading record ${i}:`, recordError.message);
        continue;
      }
    }

    console.log(`🔍 [DEBUG] Found ${plantRecords.length} records for plantId ${plantId}`);

    // Sort berdasarkan timestamp (terbaru dulu)
    plantRecords.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));

    // Implementasi pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = plantRecords.slice(startIndex, endIndex);

    // Tentukan jenis transaksi berdasarkan urutan
    const recordsWithType = paginatedRecords.map((record, index) => {
      const allRecordsForPlant = plantRecords.filter(
        (r) => r.plantId === record.plantId
      );
      const sortedByTimestamp = allRecordsForPlant.sort(
        (a, b) => parseInt(a.timestamp) - parseInt(b.timestamp)
      );
      const recordIndex = sortedByTimestamp.findIndex(
        (r) => r.recordId === record.recordId
      );

      return {
        ...record,
        transactionType: recordIndex === 0 ? "Add Plant" : "Edit Plant",
        icon: recordIndex === 0 ? "🌱" : "✏️",
      };
    });

    return {
      records: recordsWithType,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(plantRecords.length / limit),
        totalRecords: plantRecords.length,
        hasNextPage: endIndex < plantRecords.length,
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error("❌ Error getting plant transaction history:", error);
    throw error;
  }
}

// Fungsi untuk mendapatkan total record count
async function getRecordCount() {
  try {
    const { contract } = await initializePublic();

    const count = await contract.methods.recordCount().call();
    return count.toString();
  } catch (error) {
    console.error("❌ Error getting record count:", error);
    throw error;
  }
}

module.exports = {
  initializePublic,
  addPlantRecordToPublic,
  updatePlantRecordHash,
  getPlantRecordFromPublic,
  getAllPublicRecords,
  getPlantTransactionHistory,
  getRecordCount,
};
