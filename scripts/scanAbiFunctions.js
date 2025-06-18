const IUniswapV2Router02 = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const { ethers } = require("ethers");

const functionNames = IUniswapV2Router02.abi
  .filter((item) => item.type === "function")
  .map((item) => item.name);

const iface = new ethers.Interface(IUniswapV2Router02.abi);

for (const name of functionNames) {
  const methodId = iface.getFunction(name).selector;
  console.log(`${name}: ${methodId}`);
}
