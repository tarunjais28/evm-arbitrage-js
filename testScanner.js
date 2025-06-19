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
    data: "0xb6f9de95000000000000000000000000000000000000000000000000000000000001e9a70000000000000000000000000000000000000000000000000000000000000080000000000000000000000000522e5b627ccb103fb31e125f9a42fe86300dd5d0000000000000000000000000000000000000000000000000000000006852865d0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000002260fac5e5542a773aa44fbcfedf7c193bc2c599",
    to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    from: "0x522E5B627cCb103FB31e125F9A42FE86300DD5D0",
    tx: "0x5f2198ea9be5a97bb884f51f95046a135ead3e62adce54ef72232fb5ac070db9",
    value: "52668550206469780",
    hash: "0x5f2198ea9be5a97bb884f51f95046a135ead3e62adce54ef72232fb5ac070db9",
  };
  decodeSwapFunction(tx, contracts);
};

test();
