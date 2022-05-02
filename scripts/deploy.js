const { ethers, upgrades } = require('hardhat');

async function deployArcadePass() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  const ArcadePass = await ethers.getContractFactory('ArcadePass');
  const contract = await ArcadePass.deploy();

  await contract.deployed();
  console.log('ArcadePass deployed to:', contract.address);

  return contract.address;
}

async function deployUpgradeables(address) {
  // Treasure Points Contract
  const TreasurePoints = await ethers.getContractFactory('TreasurePoints');

  let proxy = await upgrades.deployProxy(TreasurePoints, [0]);

  await proxy.deployed();
  console.log('TreasurePoints deployed to:', proxy.address);

  // Arcade Staking Contract
  const constructorArgs = [address, proxy.address];
  const ArcadeStaking = await ethers.getContractFactory('ArcadeStaking');

  proxy = await upgrades.deployProxy(ArcadeStaking, constructorArgs);

  await proxy.deployed();
  console.log('ArcadeStaking deployed to:', proxy.address);
}

deployArcadePass()
  .then((address) => deployUpgradeables(address))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
