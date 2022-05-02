/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('dotenv').config();
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-gas-reporter');

const { INFURA_API_KEY, DEPLOY_PRIV_KEY, ARBISCAN_API_KEY, ETHERSCAN_API_KEY } = process.env;

// Ensure that we have all the environment variables we need.
if (!DEPLOY_PRIV_KEY) {
  throw new Error('Please set your DEPLOY_PRIV_KEY in a .env file');
}

const chainIds = {
  'arbitrum-mainnet': 42161,
  'arbitrum-rinkeby': 421611,
  hardhat: 31337,
  mainnet: 1,
  rinkeby: 4,
};

function getChainConfig(chain) {
  return {
    accounts: [DEPLOY_PRIV_KEY ?? ''],
    chainId: chainIds[chain],
    url: 'https://' + chain + '.infura.io/v3/' + INFURA_API_KEY,
  };
}

module.exports = {
  defaultNetwork: 'hardhat',
  etherscan: {
    apiKey: {
      arbitrumTestnet: ARBISCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY,
      rinkeby: ETHERSCAN_API_KEY,
      mainnet: ETHERSCAN_API_KEY,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    mainnet: getChainConfig('mainnet'),
    rinkeby: getChainConfig('rinkeby'),
    arbitrumTestnet: getChainConfig('arbitrum-rinkeby'),
    arbitrum: getChainConfig('arbitrum-mainnet'),
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  solidity: {
    version: '0.8.13',
    settings: {
      // do not include the metadata hash, since this is machine dependent
      // and we want all generated code to be deterministic
      // https://docs.soliditylang.org/en/v0.8.9/metadata.html
      metadata: {
        bytecodeHash: 'none',
      },
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
};
