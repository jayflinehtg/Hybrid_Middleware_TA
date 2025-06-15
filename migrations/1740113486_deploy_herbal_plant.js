const HerbalPlant = artifacts.require("HerbalPlant");

module.exports = function(deployer) {
  deployer.deploy(HerbalPlant)
  .then(() => {
    return HerbalPlant.deployed(); // Get the deployed instance
  })
  .then(instance => {
    console.log("HerbalPlant deployed at:", instance.address); // Log the contract address
  });
};