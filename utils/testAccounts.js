const Web3 = require("web3").Web3;
const dotenv = require("dotenv");
dotenv.config();

// Initialize Web3
const web3 = new Web3(process.env.PRIVATE_NETWORK_RPC_URL);

const SMART_CONTRACT_ADDRESS = process.env.PRIVATE_SMART_CONTRACT_ADDRESS;

// Hardcoded test accounts
const TEST_ACCOUNTS = [
  {
    id: "testUser1",
    privateKey:
      "0xa8e79b5628a502f660c772ed417e9a22d44b5d19fcda4698da68e2616c53c83c",
    fullName: "Test User 1 - Performance",
  },
  {
    id: "testUser2",
    privateKey:
      "0x254114e8429866c08717e1b2e28f705d416d013d6e48d473601ca73b84fd73b2",
    fullName: "Test User 2 - Performance",
  },
  {
    id: "testUser3",
    privateKey:
      "0xb8d1bdc91505c1235156c2511759f1871e7bac71cb404f719c1ac92ddded338e",
    fullName: "Test User 3 - Performance",
  },
];

// Create wallet dengan test accounts
const performanceWallet = web3.eth.accounts.wallet.create(0); // Create empty wallet

// Add test accounts ke wallet
TEST_ACCOUNTS.forEach((account) => {
  try {
    performanceWallet.add(account.privateKey);
    console.log(
      `✅ Added ${account.id} to wallet: ${
        performanceWallet[performanceWallet.length - 1].address
      }`
    );
  } catch (error) {
    console.error(`❌ Error adding ${account.id} to wallet:`, error.message);
  }
});

// Debug: Print wallet contents
console.log(`🔍 Wallet contains ${performanceWallet.length} accounts`);
performanceWallet.forEach((account, index) => {
  console.log(`   Index ${index}: ${account.address}`);
});

// Fungsi untuk mendapatkan account dari wallet berdasarkan ID
function getTestAccountFromWallet(userId) {
  console.log(`🔍 Looking for userId: ${userId}`);
  console.log(
    `🔍 Available TEST_ACCOUNTS:`,
    TEST_ACCOUNTS.map((acc) => acc.id)
  );

  const accountIndex = TEST_ACCOUNTS.findIndex((acc) => acc.id === userId);
  console.log(`🔍 Found accountIndex: ${accountIndex}`);

  if (accountIndex === -1) return null;

  return {
    ...TEST_ACCOUNTS[accountIndex],
    address: performanceWallet[accountIndex].address,
    walletAccount: performanceWallet[accountIndex],
  };
}

// Fungsi untuk send transaction menggunakan wallet
async function sendTransactionWithWallet(userId, transactionObject) {
  const account = getTestAccountFromWallet(userId);
  if (!account) {
    throw new Error(`Test account ${userId} not found`);
  }

  try {
    // Set from address
    transactionObject.from = account.address;

    delete transactionObject.maxFeePerGas;
    delete transactionObject.maxPriorityFeePerGas;
    delete transactionObject.type;

    if (!transactionObject.gasPrice) {
      try {
        const gasPrice = await web3.eth.getGasPrice();
        
        const minGasPrice = BigInt("1000000000"); 
        transactionObject.gasPrice = gasPrice > 0 ? gasPrice : minGasPrice;
        console.log(`💰 Set gas price: ${transactionObject.gasPrice}`);
      } catch (gasPriceError) {
        transactionObject.gasPrice = "1000000000";
        console.log(`💰 Using default gas price: 1000000000`);
      }
    }

    if (!transactionObject.nonce) {
      const nonce = await web3.eth.getTransactionCount(
        account.address,
        "pending"
      );
      transactionObject.nonce = nonce;
      console.log(`🔢 Set nonce: ${nonce}`);
    }

    console.log(
      `🔄 Sending LEGACY transaction from ${account.fullName} (${account.address})`
    );
    console.log(`📋 Transaction object:`, {
      from: transactionObject.from,
      to: transactionObject.to,
      gas: transactionObject.gas,
      gasPrice: transactionObject.gasPrice,
      nonce: transactionObject.nonce,
      data: transactionObject.data
        ? `${transactionObject.data.substring(0, 10)}...`
        : "none",
    });

    const receipt = await web3.eth.sendTransaction({
      ...transactionObject,
      type: "0x0",
    });

    console.log(`✅ Transaction successful! Hash: ${receipt.transactionHash}`);
    return receipt;
  } catch (error) {
    console.error(
      `❌ Transaction failed for ${account.fullName}:`,
      error.message
    );

    if (
      error.message.includes("Eip1559NotSupportedError") ||
      error.message.includes("doesn't support eip-1559")
    ) {
      console.log(`🔄 Retrying with pure legacy transaction format...`);

      try {
        const legacyTx = {
          from: transactionObject.from,
          to: transactionObject.to,
          gas: transactionObject.gas,
          gasPrice: transactionObject.gasPrice || "20000000000",
          nonce: transactionObject.nonce,
          data: transactionObject.data,
          value: transactionObject.value || "0x0",
        };

        const receipt = await web3.eth.sendTransaction(legacyTx);
        console.log(
          `✅ Legacy transaction successful! Hash: ${receipt.transactionHash}`
        );
        return receipt;
      } catch (retryError) {
        console.error(
          `❌ Legacy transaction retry failed:`,
          retryError.message
        );
        throw retryError;
      }
    }

    throw error;
  }
}

module.exports = {
  TEST_ACCOUNTS,
  performanceWallet,
  web3,
  SMART_CONTRACT_ADDRESS,
  getTestAccountFromWallet,
  sendTransactionWithWallet,
};
