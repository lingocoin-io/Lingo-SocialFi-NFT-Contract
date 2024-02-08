
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-network-helpers');
require('solidity-coverage')

module.exports = {
  solidity: "0.8.20",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    }  
  },
  networks: {
    hardhat : {
      chainId: 31337
    },
  }
};
