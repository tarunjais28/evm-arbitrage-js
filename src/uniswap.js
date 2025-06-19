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

    const derivedFields = {
      functionName: matched.name,
      args: {},
      path: decoded.path ? decoded.path.map((a) => a.toLowerCase()) : [],
      tokens: symbols,
      recipient: decoded.to || null,
      poolAddresses: [],
      matchingLps: [],
      txTo: tx.to,
      txFrom: tx.from,
      txHash: tx.hash,
    };

    const argNames = swapFunctions[matched.name] || [];
    argNames.forEach((name, idx) => {
      derivedFields.args[name] = decoded[idx]?.toString();
    });

    for (let i = 0; i < decoded.path.length - 1; i++) {
      let address = await getPairAddress(decoded.path[i], decoded.path[i + 1]);
      if (address) {
        derivedFields.poolAddresses.push(address);
      }
    }

    for (const address of derivedFields.poolAddresses) {
      if (contracts.includes(address.toLowerCase())) {
        derivedFields.matchingLps.push(address);
      }
    }

    if (derivedFields.matchingLps.length === 0) {
      return;
    }

    let logOutput = [];
    logOutput.push(`Function: ${derivedFields.functionName}`);
    logOutput.push("Arguments:");
    for (const [name, value] of Object.entries(derivedFields.args)) {
      logOutput.push(`  ${name}: ${value}`);
    }
    if (derivedFields.path.length > 0) {
      logOutput.push("Path: " + JSON.stringify(derivedFields.path));
    }
    logOutput.push("Tokens: " + JSON.stringify(derivedFields.tokens));
    if (derivedFields.recipient) {
      logOutput.push(`To: ${derivedFields.recipient}`);
    }
    logOutput.push(
      "Pool Addresses: " + JSON.stringify(derivedFields.poolAddresses),
    );
    for (const address of derivedFields.matchingLps) {
      logOutput.push(`Found Matching LP: ${address}`);
    }
    logOutput.push(`Transaction to: ${derivedFields.txTo}`);
    logOutput.push(`Transaction from: ${derivedFields.txFrom}`);
    logOutput.push(`Transaction hash: ${derivedFields.txHash}`);
    logOutput.push("=".repeat(100));

    console.log(chalk.green(logOutput.join("\n")));
  } catch (error) {
    // Suppress errors during decoding to prevent crashes.
    // A single failed transaction should not stop the entire process.
  }
};

module.exports = {
  provider,
  decodeSwapFunction,
};
