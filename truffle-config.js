require("dotenv").config();
const path = require("path");
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "0.0.0.0",
      port: 7545,
      network_id: "5777",
    },
    tea_sepolia: {
      provider: () => {
        // Validasi keberadaan private key dan RPC URL
        if (!process.env.PUBLIC_NETWORK_PRIVATE_KEY) {
          throw new Error(
            "PUBLIC_NETWORK_PRIVATE_KEY tidak ditemukan di .env untuk jaringan Tea Sepolia."
          );
        }
        if (!process.env.PUBLIC_NETWORK_RPC_URL) {
          throw new Error(
            "PUBLIC_NETWORK_RPC_URL tidak ditemukan di .env untuk jaringan Tea Sepolia."
          );
        }

        return new HDWalletProvider({
          privateKeys: [process.env.PUBLIC_NETWORK_PRIVATE_KEY],
          providerOrUrl: process.env.PUBLIC_NETWORK_RPC_URL,
          pollingInterval: 20000,
          numberOfAddresses: 1,
          shareNonce: true,
          derivationPath: "m/44'/60'/0'/0/",
          chainId: 10218,
          timeout: 90000,
        });
      },
      network_id: 10218,
      gas: 8000000,
      gasPrice: 20000000000,
      confirmations: 1,
      timeoutBlocks: 300,
      networkCheckTimeout: 180000,
      deploymentPollingInterval: 20000,
      skipDryRun: true,
      disableConfirmationListener: true,
    },
  },
  compilers: {
    solc: {
      version: "0.8.0",
    },
  },
  contracts_directory: path.join(__dirname, "contracts"),
  contracts_build_directory: path.join(__dirname, "build", "contracts"),
  mocha: {
    timeout: 300000,
    slow: 30000,
  },
};
