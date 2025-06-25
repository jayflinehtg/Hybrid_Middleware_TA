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
    besu: {
      provider: () => {
        if (!process.env.PRIVATE_NETWORK_PRIVATE_KEY) {
          throw new Error(
            "PRIVATE_NETWORK_PRIVATE_KEY tidak ditemukan di .env untuk jaringan Hyperledger Besu."
          );
        }
        if (!process.env.PRIVATE_NETWORK_RPC_URL) {
          throw new Error(
            "PRIVATE_NETWORK_RPC_URL tidak ditemukan di .env untuk jaringan Hyperledger Besu."
          );
        }

        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_NETWORK_PRIVATE_KEY],
          providerOrUrl: process.env.PRIVATE_NETWORK_RPC_URL,
          chainId: 1337,
        });
      },
      network_id: 1337,
      gas: 4500000,
      gasPrice: 0,
      confirmations: 0,
      timeoutBlocks: 200,
      networkCheckTimeout: 60000,
      deploymentPollingInterval: 8000,
      skipDryRun: true,
    },
    tea_sepolia: {
      provider: () => {
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
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  contracts_directory: path.join(__dirname, "contracts"),
  contracts_build_directory: path.join(__dirname, "build", "contracts"),
  mocha: {
    timeout: 300000,
    slow: 30000,
  },
};
