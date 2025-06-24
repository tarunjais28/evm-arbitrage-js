import "dotenv/config";
import * as fs from "fs";
import { provider, decodeSwapFunction } from "./src/uniswap";
import { TransactionResponse } from "ethers";

const init = () => {
  let contracts: string[];
  try {
    contracts = fs
      .readFileSync("resources/contracts.txt", "utf-8")
      .split("\n")
      .map((addr: string) => addr.trim().toLowerCase())
      .filter((addr: string) => addr.length > 0);
  } catch (error) {
    console.error("Error reading contracts file: resources/contracts.txt");
    console.error("Please make sure the file exists and is readable.");
    process.exit(1);
  }

  provider.on("pending", async (txHash: string) => {
    try {
      const tx: TransactionResponse | null =
        await provider.getTransaction(txHash);
      if (
        tx &&
        tx.data.length > 4 &&
        !tx.blockHash &&
        !tx.blockNumber &&
        tx.to &&
        tx.to.toLowerCase() ===
          "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D".toLowerCase()
      ) {
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
