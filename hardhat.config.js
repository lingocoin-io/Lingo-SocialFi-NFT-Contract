
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-network-helpers');
require('solidity-coverage')
require('hardhat-gas-reporter');

module.exports = {
  solidity: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    }  
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21,
  },
  networks: {
    hardhat : {
      chainId: 31337
    },
  }
};
