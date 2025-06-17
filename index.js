const fs = require('fs');
const { ethers } = require("ethers");

require('dotenv').config();

const url = process.env.WEBSOCKET_ENDPOINT;

// Connect to the WebSocket provider
const provider = new ethers.WebSocketProvider(url);


// === Load ABI ===
const abi = require('./uniswap_routerv2_abi.json');
const iface = new ethers.Interface(abi);

// === Function Identifiers to Logical Names ===
const swapFunctions = {
    "swapETHForExactTokens": ["amountOut"],
    "swapExactETHForTokens": ["amountOutMin"],
    "swapExactETHForTokensSupportingFeeOnTransferTokens": ["amountOutMin"],
    "swapExactTokensForETH": ["amountIn", "amountOutMin"],
    "swapExactTokensForETHSupportingFeeOnTransferTokens": ["amountIn", "amountOutMin"],
    "swapExactTokensForTokens": ["amountIn", "amountOutMin"],
    "swapExactTokensForTokensSupportingFeeOnTransferTokens": ["amountIn", "amountOutMin"],
    "swapTokensForExactETH": ["amountOut", "amountInMax"],
    "swapTokensForExactTokens": ["amountOut", "amountInMax"]
};

const funcNames = [
    "swapETHForExactTokens",
    "swapExactETHForTokens",
    "swapExactETHForTokensSupportingFeeOnTransferTokens",
    "swapExactTokensForETH",
    "swapExactTokensForETHSupportingFeeOnTransferTokens",
    "swapExactTokensForTokens",
    "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    "swapTokensForExactETH",
    "swapTokensForExactTokens"
];

const decodeSwapFunction = (txInput) => {
    // === Decode the function selector ===
    const selector = txInput.slice(0, 10);
    let matched = null;

    for (const name of funcNames) {
        const methodId = iface.getFunction(name).selector;
        if (selector === methodId) {
            matched = iface.getFunction(name);
            break;
        }
    }

    if (!matched) {
        return;
    }

    // === Decode calldata ===
    const decoded = iface.decodeFunctionData(matched.name, txInput);

    // === Display Output ===
    console.log(`Function: ${matched.name}`);
    console.log("Arguments:");

    const argNames = swapFunctions[matched.name] || [];
    argNames.forEach((name, idx) => {
        console.log(`${name}: ${decoded[idx]?.toString()}`);
    });

    if (decoded.path) {
        console.log("Path:", decoded.path.map((a) => a.toLowerCase()));
    }
    if (decoded.to) {
        console.log("To:", decoded.to);
    }
    if (decoded.deadline) {
        console.log("Deadline:", decoded.deadline.toString());
    }
    return true;
};

// Listen for pending transactions
const init = () => {
    // Read contract addresses from contract.txt in the array
    const contracts = fs.readFileSync("contracts.txt", "utf-8").split("\n");

    provider.on("pending", async (txHash) => {
        try {
            const tx = await provider.getTransaction(txHash);
            if (tx) {
                if (tx.data.length > 4) {
                    if (decodeSwapFunction(tx.data)) {
                        if (contracts.includes(tx.to.toLocaleLowerCase())) {
                            console.log(`Found: ${tx.to}`);
                        }
                        if (contracts.includes(tx.from.toLocaleLowerCase())) {
                            console.log(`Found: ${tx.from}`);
                        }
                        console.log(`to: ${tx.to}`);
                        console.log(`from: ${tx.from}`);
                        console.log(`tx: ${tx.hash}`);
                        console.log("=".repeat(100));
                    }
                }
            }
        } catch (err) {
            console.error(`Error fetching transaction ${txHash}:`, err);
        }
    });

    console.log("Listening for pending transactions...");
};

init();
