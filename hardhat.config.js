require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-network-helpers');
require('solidity-coverage')
require('hardhat-gas-reporter');

const dotenv = require('dotenv');
dotenv.config();

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const ETHEREUM_PRIVATE_KEY = process.env.ETHEREUM_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21
  },
  networks: {
    hardhat: {
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: SEPOLIA_PRIVATE_KEY !== undefined ? [SEPOLIA_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    mainnet: {
      url: ETHEREUM_RPC_URL,
      accounts:
          ETHEREUM_PRIVATE_KEY !== undefined ? [ETHEREUM_PRIVATE_KEY] : [],
      chainId: 1
    }
  }
};
