const { ethers } = require("ethers");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const IUniswapV2Router02 = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const ERC20Abi = require("erc-20-abi");
const { swapFunctions, funcNames } = require("./constants");

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

    let logOutput = [];
    logOutput.push(`Function: ${matched.name}`);
    logOutput.push("Arguments:");

    const argNames = swapFunctions[matched.name] || [];
    argNames.forEach((name, idx) => {
      logOutput.push(`  ${name}: ${decoded[idx]?.toString()}`);
    });

    if (decoded.path) {
      logOutput.push(
        "Path: " + JSON.stringify(decoded.path.map((a) => a.toLowerCase())),
      );
    }

    logOutput.push("Tokens: " + JSON.stringify(symbols));

    if (decoded.to) {
      logOutput.push(`To: ${decoded.to}`);
    }

    let poolAddresses = [];
    for (let i = 0; i < decoded.path.length - 1; i++) {
      let address = await getPairAddress(decoded.path[i], decoded.path[i + 1]);
      if (address) {
        poolAddresses.push(address);
      }
    }
    logOutput.push("Pool Addresses: " + JSON.stringify(poolAddresses));

    let contains = false;
    for (const address of poolAddresses) {
      if (contracts.includes(address.toLowerCase())) {
        logOutput.push(`Found Matching LP: ${address}`);
        contains = true;
      }
    }

    if (!contains) {
      return;
    }

    logOutput.push(`Transaction to: ${tx.to}`);
    logOutput.push(`Transaction from: ${tx.from}`);
    logOutput.push(`Transaction hash: ${tx.hash}`);
    logOutput.push("=".repeat(100));

    console.log(logOutput.join("\n"));
  } catch (error) {
    // Suppress errors during decoding to prevent crashes.
    // A single failed transaction should not stop the entire process.
  }
};

module.exports = {
  provider,
  decodeSwapFunction,
};
