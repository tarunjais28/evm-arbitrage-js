require("dotenv").config();
const fs = require("fs");
const { decodeSwapFunction } = require("./src/uniswap");

const test = () => {
  let contracts;
  try {
    contracts = fs
      .readFileSync("resources/contracts.txt", "utf-8")
      .split("\n")
      .map((addr) => addr.trim().toLowerCase())
      .filter((addr) => addr.length > 0);
  } catch (error) {
    console.error("Error reading contracts file: resources/contracts.txt");
    console.error("Please make sure the file exists and is readable.");
    process.exit(1);
  }

  let tx = {
    data: "0x7ff36ab50000000000000000000000000000000000000000000000002af7d9cc4e5f841f0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000b0be521b8fd8d4f5e0a28f5fea786cf2b249690b000000000000000000000000000000000000000000000000000000006854565b0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006b175474e89094c44da98b954eedeac495271d0f",
    to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    from: "0xACBCB2724CFafb839C752d71997A8a7a16989b2e",
    value: "1300000000000000",
    hash: "0xe8df5336baa37ed479444609aebc40bf04ff86515d1b7a7e98934010882ac738",
  };
  decodeSwapFunction(tx, contracts);
};

test();
