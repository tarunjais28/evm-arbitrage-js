const { ethers } = require("ethers");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const IUniswapV2Router02 = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const ERC20Abi = require("erc-20-abi");
const { swapFunctions, funcNames, pairMap, makeKey } = require("./constants");

const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

const provider = new ethers.WebSocketProvider(process.env.WEBSOCKET_ENDPOINT);

const factoryContract = new ethers.Contract(
  factoryAddress,
  IUniswapV2Factory.abi,
  provider,
);

const iface = new ethers.Interface(IUniswapV2Router02.abi);

async function getPairAddress(tokenA, tokenB) {
  let pair = await factoryContract.getPair(tokenA, tokenB);
  return pair;
}

const decodeSwapFunction = async (tx, contracts) => {
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
      console.error(`Error getting symbol for token ${path}:`, error);
    }
  }

  console.log(`Function: ${matched.name}`);
  console.log("Arguments:");

  const argNames = swapFunctions[matched.name] || [];
  argNames.forEach((name, idx) => {
    console.log(`${name}: ${decoded[idx]?.toString()}`);
  });

  if (decoded.path) {
    console.log(
      "Path:",
      decoded.path.map((a) => a.toLowerCase()),
    );
  }

  console.log("tokens:", symbols);

  let addresses = [];
  for (let i = 0; i < symbols.length - 1; i++) {
    const addrs = pairMap.get(makeKey(symbols[i], symbols[i + 1]));
    if (addrs) {
      addresses = [...addresses, ...addrs];
    }
  }

  console.log("possibleLPs:", addresses);

  if (decoded.to) {
    console.log("To:", decoded.to);
  }

  let poolAddresses = [];
  for (let i = 0; i < decoded.path.length - 1; i++) {
    let address = await getPairAddress(decoded.path[i], decoded.path[i + 1]);
    if (address) {
      poolAddresses.push(address);
    }
  }
  console.log("poolAddresses:", poolAddresses);

  for (const address of poolAddresses) {
    if (contracts.includes(address)) {
      console.log(`Found: ${address}`);
    }
  }

  console.log(`to: ${tx.to}`);
  console.log(`from: ${tx.from}`);
  console.log(`tx: ${tx.hash}`);
  console.log("=".repeat(100));
};

module.exports = {
  provider,
  decodeSwapFunction,
};
