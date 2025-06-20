require("dotenv").config();
const fs = require("fs");
const { provider, decodeSwapFunction } = require("./src/uniswap");

const init = () => {
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

  provider.on("pending", async (txHash) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (tx && tx.data.length > 4 && !tx.blockHash && !tx.blockNumber) {
        decodeSwapFunction(tx, contracts);
      }
    } catch (err) {
      // Errors are expected here during periods of high load on the RPC node.
      // For example, the transaction may have been dropped or the node may be slow to respond.
      // We can ignore them to prevent log spam.
    }
  });

  console.log("Listening for pending transactions...");
};

init();
