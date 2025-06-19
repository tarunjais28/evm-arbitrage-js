const { ethers } = require("ethers");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const IUniswapV2Router02 = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const { factoryAddress, routerAddress } = require("./constants");

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

async function getReserves(tokenA, tokenB) {
  try {
    const reserves = await routerContract.getReserves(tokenA, tokenB);
    return reserves;
  } catch (e) {
    return null;
  }
}

module.exports = {
  provider,
  factoryContract,
  routerContract,
  iface,
  getPairAddress,
  getReserves,
};
