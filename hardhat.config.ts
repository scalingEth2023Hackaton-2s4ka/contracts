import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const { API_URL, PRIVATE_KEY } = process.env;
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {version: "0.8.9"},
      {version: "0.6.6"},
      {version: "0.4.24"},
    ]
  },
  networks: {
    sepolia: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: 1200000000
    }
  }
};

export default config;
