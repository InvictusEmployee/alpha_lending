import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  // solidity: "0.8.16",
  solidity: {
        compilers: [
          {
            version: "0.8.7",
            settings: {
              optimizer: {
                enabled: true,
                runs: 500,
              },
            },
          },
          {
            version: "0.7.0",
            settings: {
              optimizer: {
                enabled: true,
                runs: 500,
              },
            },
          },
          {
            version: "0.8.15",
            settings: {
              optimizer: {
                enabled: true,
                runs: 500,
              },
            },
          },
          {
            version: "0.8.0",
            settings: {
              optimizer: {
                enabled: true,
                runs: 500,
              },
            },
          },
          {
            version: "0.8.16",
            settings: {
              optimizer: {
                enabled: true,
                runs: 500,
              },
            },
          },
          {
            version: "0.4.17",
            settings: {
              optimizer: {
                enabled: true,
                runs: 500,
              },
            },
          },
        ],
      },
};

export default config;

