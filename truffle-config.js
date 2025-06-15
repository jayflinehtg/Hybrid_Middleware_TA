require("dotenv").config(); // Ensure dotenv is loaded first
const path = require("path");

module.exports = {
  networks: {
    development: {
      host: "0.0.0.0",
      port: 7545, // Ganache default port
      network_id: "5777", // Match any network id
    },
  },
  compilers: {
    solc: {
      version: "0.8.0", // Specify the version of Solidity you are using
    },
  },
  contracts_directory: path.join(__dirname, "contracts"),
  contracts_build_directory: path.join(__dirname, "build", "contracts"),
  mocha: {
    // Configure testing timeout if needed
    // timeout: 100000
  },
};
