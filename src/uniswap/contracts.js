const { ethers } = require("ethers");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const IUniswapV2Router02 = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const { factoryAddress, routerAddress } = require("./constants");
const UniswapPair = require("eth-abis/abis/UniswapPair.json");
const ERC20Abi = require("erc-20-abi");

const provider = new ethers.WebSocketProvider(process.env.WEBSOCKET_ENDPOINT);

const factoryContract = new ethers.Contract(
  factoryAddress,
  IUniswapV2Factory.abi,
  provider,
);

const routerContract = new ethers.Contract(
  routerAddress,
  IUniswapV2Router02.abi,
  provider,
);

const iface = new ethers.Interface(IUniswapV2Router02.abi);

async function getPairAddress(tokenA, tokenB) {
  try {
    const pair = await factoryContract.getPair(tokenA, tokenB);
    return pair;
  } catch (e) {
    return null;
  }
}

async function getReserves(pairAddress) {
  const pairContract = new ethers.Contract(pairAddress, UniswapPair, provider);

  let [reserve0, reserve1, _] = await pairContract.getReserves();
  return [BigInt(reserve0), BigInt(reserve1)];
}

async function balanceOf(contractAddress, address) {
  const contract = new ethers.Contract(contractAddress, ERC20Abi, provider);
  let balance = await contract.balanceOf(address);
  return balance;
}

module.exports = {
  provider,
  factoryContract,
  routerContract,
  iface,
  getPairAddress,
  getReserves,
  balanceOf,
};
