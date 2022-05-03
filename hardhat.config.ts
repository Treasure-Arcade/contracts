import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@openzeppelin/hardhat-upgrades';
import 'dotenv/config';
import { HardhatUserConfig } from 'hardhat/types';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

const { INFURA_API_KEY, DEPLOY_PRIV_KEY, ARBISCAN_API_KEY, ETHERSCAN_API_KEY } = process.env;

// Ensure that we have all the environment variables we need.
if (!DEPLOY_PRIV_KEY) {
  throw new Error('Please set your DEPLOY_PRIV_KEY in a .env file');
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      live: false,
      allowUnlimitedContractSize: false,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [`${DEPLOY_PRIV_KEY}`],
      chainId: 1,
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [`${DEPLOY_PRIV_KEY}`],
      chainId: 4,
      live: true,
      saveDeployments: true,
      tags: ['staging'],
    },
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts: [`${DEPLOY_PRIV_KEY}`],
      chainId: 42161,
      live: true,
      saveDeployments: true,
      gasMultiplier: 2,
      deploy: ['deploy/arbitrum'],
    },
    arbitrumRinkeby: {
      url: `https://arbitrum-rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [`${DEPLOY_PRIV_KEY}`],
      chainId: 421611,
      live: false,
      saveDeployments: true,
      gasMultiplier: 2,
      deploy: ['deploy/arbitrumRinkeby'],
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.13',
        settings: {
          metadata: {
            bytecodeHash: 'none',
          },
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: {
      arbitrumTestnet: ARBISCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY,
      rinkeby: ETHERSCAN_API_KEY,
      mainnet: ETHERSCAN_API_KEY,
    },
  },
  namedAccounts: {
    deployer: 0,
    user1: 1,
    user2: 2,
  },
  mocha: {
    timeout: 60000,
  },
  gasReporter: {
    currency: 'USD',
    enabled: false,
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    deploy: 'deploy/arbitrum',
    deployments: 'deployments',
    sources: './contracts',
    tests: './test',
  },
};

export default config;
