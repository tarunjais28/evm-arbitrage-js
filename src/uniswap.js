const { ethers } = require("ethers");
const { SwapData } = require("./uniswap/models");
const { iface, getPairAddress, provider } = require("./uniswap/contracts");
const { funcNames, swapFunctions } = require("./uniswap/constants");
const ERC20Abi = require("erc-20-abi");

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

    if (!decoded.path) {
      return;
    }

    let symbols = [];
    for (const path of decoded.path) {
      const token = new ethers.Contract(path, ERC20Abi, provider);
      try {
        const symbol = await token.symbol();
        symbols.push(symbol);
      } catch (error) {
        symbols.push("UNKNOWN");
      }
    }

    const swapData = new SwapData(
      matched.name,
      {},
      decoded.path ? decoded.path.map((a) => a.toLowerCase()) : [],
      symbols,
      decoded.to || null,
      tx.to,
      tx.from,
      tx.hash,
      tx.value,
    );

    const argNames = swapFunctions[swapData.functionName] || [];
    argNames.forEach((name, idx) => {
      swapData.args[name] = decoded[idx]?.toString();
    });

    for (let i = 0; i < swapData.path.length - 1; i++) {
      let address = await getPairAddress(
        swapData.path[i],
        swapData.path[i + 1],
      );
      if (address) {
        swapData.poolAddresses.push(address);
      }
    }

    for (const address of swapData.poolAddresses) {
      if (contracts.includes(address.toLowerCase())) {
        swapData.matchingLps.push(address);
      }
    }

    if (swapData.matchingLps.length === 0) {
      return;
    }

    await swapData.swap();
    swapData.display();
  } catch (error) {
    // console.error("Error in decodeSwapFunction:", error);
  }
};

module.exports = {
  decodeSwapFunction,
  provider,
};
