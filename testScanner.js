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
    data: "0x7ff36ab50000000000000000000000000000000000000000000000000000000000390208000000000000000000000000000000000000000000000000000000000000008000000000000000000000000087f5e00259081a1ffa0bcd74461bc3d04713f8bc0000000000000000000000000000000000000000000000000000000068563b440000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    from: "0xACBCB2724CFafb839C752d71997A8a7a16989b2e",
    value: "1626000000000000",
    hash: "0x49e31d95bb5db5b48d42f3ef7c46e35fe9971fcacfdc86f8198a81bc1af38b8a",
  };
  if (
    tx &&
    tx.data.length > 4 &&
    tx.to == "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
  ) {
    decodeSwapFunction(tx, contracts);
  }
};

test();
