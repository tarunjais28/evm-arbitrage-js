"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs = __importStar(require("fs"));
const uniswap_1 = require("./src/uniswap");
const init = () => {
    let contracts;
    try {
        contracts = fs
            .readFileSync("resources/contracts.txt", "utf-8")
            .split("\n")
            .map((addr) => addr.trim().toLowerCase())
            .filter((addr) => addr.length > 0);
    }
    catch (error) {
        console.error("Error reading contracts file: resources/contracts.txt");
        console.error("Please make sure the file exists and is readable.");
        process.exit(1);
    }
    uniswap_1.provider.on("pending", async (txHash) => {
        try {
            const tx = await uniswap_1.provider.getTransaction(txHash);
            if (tx &&
                tx.data.length > 4 &&
                !tx.blockHash &&
                !tx.blockNumber &&
                tx.to && tx.to.toLowerCase() === "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D".toLowerCase()) {
                (0, uniswap_1.decodeSwapFunction)(tx, contracts);
            }
        }
        catch (err) {
            // Errors are expected here during periods of high load on the RPC node.
            // For example, the transaction may have been dropped or the node may be slow to respond.
            // We can ignore them to prevent log spam.
        }
    });
    console.log("Listening for pending transactions...");
};
init();
