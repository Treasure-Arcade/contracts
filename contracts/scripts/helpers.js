const { ethers, upgrades } = require('hardhat');

const deployContract = async function (contractName, constructorArgs) {
  let factory;
  try {
    factory = await ethers.getContractFactory(contractName);
  } catch (e) {
    console.log(e);
  }
  let contract = await factory.deploy(...(constructorArgs || []));
  await contract.deployed();
  return contract;
};

const initializeContract = async function (contractName, constructorArgs) {
  let factory;
  try {
    factory = await ethers.getContractFactory(contractName);
  } catch (e) {
    console.log(e);
  }
  let contract = await upgrades.deployProxy(factory, constructorArgs);
  await contract.deployed();
  return contract;
};

const upgradeContract = async function (contractName, address) {
  let factory;
  try {
    factory = await ethers.getContractFactory(contractName);
  } catch (e) {
    console.log(e);
  }
  await upgrades.upgradeProxy(address, factory);
};

module.exports = { deployContract, initializeContract, upgradeContract };
