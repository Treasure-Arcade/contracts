const { ethers, upgrades } = require('hardhat');

async function main() {
  const TreasurePoints = await ethers.getContractFactory('TreasurePoints');

  const mc = await upgrades.deployProxy(TreasurePoints);

  await mc.deployed();
  console.log('TreasurePoints deployed to:', mc.address);
}

main();
