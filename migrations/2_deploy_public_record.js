const PublicRecord = artifacts.require("PublicRecord");

module.exports = function (deployer, network) {
  // Hanya deploy PublicRecord ke jaringan tea_sepolia
  if (network === "tea_sepolia") {
    deployer
      .deploy(PublicRecord)
      .then(() => {
        return PublicRecord.deployed();
      })
      .then((instance) => {
        console.log("PublicRecord deployed at:", instance.address);
      });
  } else {
    console.log(`Skipping PublicRecord deployment for network: ${network}`);
  }
};
