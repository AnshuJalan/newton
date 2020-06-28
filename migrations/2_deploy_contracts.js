var CallOption = artifacts.require("./CallOption.sol");
var PutOption = artifacts.require('./PutOption.sol');
var UsingPriceFeed = artifacts.require('./priceContract/UsingPriceFeed.sol');

module.exports = function(deployer) {

  const daiAddress = "0x8ad3aa5d5ff084307d28c8f514d7a193b2bfe725";
  const tellorAddress = "0xFe41Cb708CD98C5B20423433309E55b53F79134a";
  deployer.deploy(CallOption, daiAddress, tellorAddress);
  deployer.deploy(PutOption, daiAddress, tellorAddress);
  deployer.deploy(UsingPriceFeed, tellorAddress);
};
