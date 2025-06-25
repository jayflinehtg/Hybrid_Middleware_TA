const HerbalPlant = artifacts.require("HerbalPlant");

module.exports = function (deployer, network) {
  // Deploy HerbalPlant ke jaringan private (development/Ganache atau besu/Hyperledger Besu)
  if (network === "development" || network === "besu") {
    deployer
      .deploy(HerbalPlant)
      .then(() => {
        return HerbalPlant.deployed();
      })
      .then((instance) => {
        console.log(`HerbalPlant deployed to ${network} at:`, instance.address);
      });
  } else {
    console.log(`Skipping HerbalPlant deployment for network: ${network}`);
  }
};
