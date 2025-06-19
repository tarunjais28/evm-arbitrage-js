const { ethers } = require("ethers");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const IUniswapV2Router02 = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const ERC20Abi = require("erc-20-abi");
const { swapFunctions, funcNames } = require("./constants");
const chalk = require("chalk");

class DerivedData {
  constructor(functionName, args, path, tokens, recipient, txTo, txFrom, txHash) {
    this.functionName = functionName;
    this.args = args;
    this.path = path;
    this.tokens = tokens;
    this.recipient = recipient;
    this.txTo = txTo;
    this.txFrom = txFrom;
    this.txHash = txHash;
    this.poolAddresses = [];
    this.matchingLps = [];
  }

  display() {
    let logOutput = [];
    logOutput.push(`Function: ${this.functionName}`);
    logOutput.push("Arguments:");
    for (const [name, value] of Object.entries(this.args)) {
      logOutput.push(`  ${name}: ${value}`);
    }
    if (this.path.length > 0) {
      logOutput.push("Path: " + JSON.stringify(this.path));
    }
    logOutput.push("Tokens: " + JSON.stringify(this.tokens));
    if (this.recipient) {
      logOutput.push(`To: ${this.recipient}`);
    }
    logOutput.push(
      "Pool Addresses: " + JSON.stringify(this.poolAddresses),
    );
    for (const address of this.matchingLps) {
      logOutput.push(`Found Matching LP: ${address}`);
    }
    logOutput.push(`Transaction to: ${this.txTo}`);
    logOutput.push(`Transaction from: ${this.txFrom}`);
    logOutput.push(`Transaction hash: ${this.txHash}`);
    logOutput.push("=".repeat(100));

    console.log(chalk.green(logOutput.join("\n")));
  }
}

const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

const provider = new ethers.WebSocketProvider(process.env.WEBSOCKET_ENDPOINT);

const factoryContract = new ethers.Contract(
  factoryAddress,
  IUniswapV2Factory.abi,
  provider,
);

const iface = new ethers.Interface(IUniswapV2Router02.abi);

async function getPairAddress(tokenA, tokenB) {
  try {
    const pair = await factoryContract.getPair(tokenA, tokenB);
    return pair;
  } catch (e) {
    // This can happen if the pair doesn't exist. Return null and let the caller handle it.
    return null;
  }
}

const decodeSwapFunction = async (tx, contracts) => {
  try {
    const selector = tx.data.slice(0, 10);
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

    const decoded = iface.decodeFunctionData(matched.name, tx.data);

    let symbols = [];
    for (const path of decoded.path) {
      const token = new ethers.Contract(path, ERC20Abi, provider);
      try {
        const symbol = await token.symbol();
        symbols.push(symbol);
      } catch (error) {
        // Not logging error here to prevent distorted output
      }
    }

    const derivedData = new DerivedData(
      matched.name,
      {},
      decoded.path ? decoded.path.map((a) => a.toLowerCase()) : [],
      symbols,
      decoded.to || null,
      tx.to,
      tx.from,
      tx.hash,
    );

    const argNames = swapFunctions[derivedData.functionName] || [];
    argNames.forEach((name, idx) => {
      derivedData.args[name] = decoded[idx]?.toString();
    });

    for (let i = 0; i < derivedData.path.length - 1; i++) {
      let address = await getPairAddress(derivedData.path[i], derivedData.path[i + 1]);
      if (address) {
        derivedData.poolAddresses.push(address);
      }
    }

    for (const address of derivedData.poolAddresses) {
      if (contracts.includes(address.toLowerCase())) {
        derivedData.matchingLps.push(address);
      }
    }

    if (derivedData.matchingLps.length === 0) {
      return;
    }

    derivedData.display();
  } catch (error) {
    // Suppress errors during decoding to prevent crashes.
    // A single failed transaction should not stop the entire process.
  }
};

module.exports = {
  provider,
  decodeSwapFunction,
};
