const HerbalPlant = artifacts.require("HerbalPlant");

module.exports = function (deployer, network) {
  // Hanya deploy HerbalPlant ke jaringan development (Ganache)
  if (network === "development") {
    deployer
      .deploy(HerbalPlant)
      .then(() => {
        return HerbalPlant.deployed();
      })
      .then((instance) => {
        console.log("HerbalPlant deployed at:", instance.address);
      });
  } else {
    console.log(`Skipping HerbalPlant deployment for network: ${network}`);
  }
};
