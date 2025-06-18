require("dotenv").config();
const fs = require("fs");
const { provider, decodeSwapFunction } = require("./src/uniswap");

const init = () => {
  const contracts = fs
    .readFileSync("resources/contracts.txt", "utf-8")
    .split("\n")
    .map((addr) => addr.trim().toLowerCase())
    .filter((addr) => addr.length > 0);

  provider.on("pending", async (txHash) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (tx) {
        if (tx.data.length > 4) {
          decodeSwapFunction(tx, contracts);
        }
      }
    } catch (err) {
      console.error(`Error fetching transaction ${txHash}:`, err);
    }
  });

  console.log("Listening for pending transactions...");
};

init();
