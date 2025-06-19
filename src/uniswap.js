const { ethers } = require("ethers");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const IUniswapV2Router02 = require("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const ERC20Abi = require("erc-20-abi");
const { swapFunctions, funcNames } = require("./constants");
const chalk = require("chalk");

class DerivedData {
  constructor(
    functionName,
    args,
    path,
    tokens,
    recipient,
    txTo,
    txFrom,
    txHash,
    value,
  ) {
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
    this.value = value;
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
    logOutput.push("Pool Addresses: " + JSON.stringify(this.poolAddresses));
    for (const address of this.matchingLps) {
      logOutput.push(`Found Matching LP: ${address}`);
    }
    logOutput.push(`Transaction to: ${this.txTo}`);
    logOutput.push(`Transaction from: ${this.txFrom}`);
    logOutput.push(`Transaction hash: ${this.txHash}`);
    logOutput.push(`Value: ${ethers.formatEther(this.value)} ETH`);
    logOutput.push("=".repeat(100));

    console.log(chalk.green(logOutput.join("\n")));
  }
}

class SwapData extends DerivedData {
  constructor(
    functionName,
    args,
    path,
    tokens,
    recipient,
    txTo,
    txFrom,
    txHash,
    value,
  ) {
    super(
      functionName,
      args,
      path,
      tokens,
      recipient,
      txTo,
      txFrom,
      txHash,
      value,
    );
    this.amount0Out = 0;
    this.amount1Out = 0;
    this.reserve0 = 0;
    this.reserve1 = 0;
  }

  async _swap(amounts) {
    for (let i = 0; i < this.path.length - 1; i++) {
      const input = this.path[i];
      const [token0] = sortTokens(input, this.path[i + 1]);
      const amountOut = amounts[i + 1];
      if (input.toLowerCase() === token0.toLowerCase()) {
        this.amount0Out = 0;
        this.amount1Out = amountOut;
      } else {
        this.amount0Out = amountOut;
        this.amount1Out = 0;
      }
    }
  }

  async _swapSupportingFeeOnTransferTokens() {
    for (let i = 0; i < this.path.length - 1; i++) {
      const input = this.path[i];
      const output = this.path[i + 1];
      const [token0] = sortTokens(input, output);
      let address = await getPairAddress(input, output);
      let [reserve0, reserve1] = await getReserves(address);
      let [reserveInput, reserveOutput] =
        input == token0 ? [reserve0, reserve1] : [reserve1, reserve0];
      const token = new ethers.Contract(input, ERC20Abi, provider);
      let amountInput = (await token.balanceOf(address)) - reserveInput;
      let amountOutput;
      try {
        amountOutput = await routerContract.getAmountOut(
          amountInput,
          reserveInput,
          reserveOutput,
        );
        if (input.toLowerCase() === token0.toLowerCase()) {
          this.amount0Out = 0;
          this.amount1Out = amountOutput;
        } else {
          this.amount0Out = amountOutput;
          this.amount1Out = 0;
        }
      } catch (e) {
        // console.log("Could not get amounts in");
        return;
      }
    }
  }

  async swap() {
    if (this.functionName === "swapETHForExactTokens") {
      if (this.tokens[0] !== "WETH") {
        return;
      }
      let amounts;
      try {
        amounts = await routerContract.getAmountsIn(
          this.args.amountOut,
          this.path,
        );
      } catch (e) {
        // console.log("Could not get amounts in");
        return;
      }

      if (amounts[0] > this.value) {
        return;
      }

      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      console.log(chalk.yellow("Arbitrage opportunity found!"));
      console.log(
        `Required ETH: ${ethers.formatEther(amounts[0])}, Sent ETH: ${ethers.formatEther(this.value)}`,
      );
      await this._swap(amounts);
    } else if (this.functionName === "swapExactETHForTokens") {
      if (this.tokens[0] !== "WETH") {
        return;
      }
      let amounts;
      try {
        amounts = await routerContract.getAmountsIn(
          this.args.amountOut,
          this.path,
        );
      } catch (e) {
        // console.log("Could not get amounts in");
        return;
      }

      if (amounts[amounts.length - 1] < this.args.amountOutMin) {
        return;
      }

      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      console.log(chalk.yellow("Arbitrage opportunity found!"));
      console.log(
        `Required ETH: ${ethers.formatEther(amounts[0])}, Sent ETH: ${ethers.formatEther(this.value)}`,
      );
      await this._swap(amounts);
    } else if (
      this.functionName === "swapExactETHForTokensSupportingFeeOnTransferTokens"
    ) {
      if (this.tokens[0] !== "WETH") {
        return;
      }

      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      console.log(chalk.yellow("Arbitrage opportunity found!"));
      console.log(
        `Required ETH: ${ethers.formatEther(amounts[0])}, Sent ETH: ${ethers.formatEther(this.value)}`,
      );
      await this._swapSupportingFeeOnTransferTokens();
    } else if (this.functionName === "swapExactTokensForETH") {
      if (this.tokens[this.tokens.length - 1] !== "WETH") {
        return;
      }

      let amounts;
      try {
        amounts = await routerContract.getAmountsOut(
          this.args.amountIn,
          this.path,
        );
      } catch (e) {
        // console.log("Could not get amounts in");
        return;
      }

      if (amounts[amounts.length - 1] < this.args.amountOutMin) {
        return;
      }

      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      console.log(chalk.yellow("Arbitrage opportunity found!"));
      console.log(
        `Required ETH: ${ethers.formatEther(amounts[0])}, Sent ETH: ${ethers.formatEther(this.value)}`,
      );
      await this._swap(amounts);
    } else if (
      this.functionName === "swapExactTokensForETHSupportingFeeOnTransferTokens"
    ) {
      if (this.tokens[this.tokens.length - 1] !== "WETH") {
        return;
      }

      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      console.log(chalk.yellow("Arbitrage opportunity found!"));
      await this._swapSupportingFeeOnTransferTokens();
    } else if (this.functionName === "swapExactTokensForTokens") {
      let amounts;
      try {
        amounts = await routerContract.getAmountsIn(
          this.args.amountOut,
          this.path,
        );
      } catch (e) {
        // console.log("Could not get amounts in");
        return;
      }

      if (amounts[amounts.length - 1] < this.args.amountOutMin) {
        return;
      }

      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      console.log(chalk.yellow("Arbitrage opportunity found!"));
      console.log(
        `Required ETH: ${ethers.formatEther(amounts[0])}, Sent ETH: ${ethers.formatEther(this.value)}`,
      );
      await this._swap(amounts);
    } else if (
      this.functionName ===
      "swapExactTokensForTokensSupportingFeeOnTransferTokens"
    ) {
      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      await this._swapSupportingFeeOnTransferTokens();
    } else if (this.functionName === "swapTokensForExactETH") {
      if (this.tokens[this.tokens.length - 1] !== "WETH") {
        return;
      }

      let amounts;
      try {
        amounts = await routerContract.getAmountsIn(
          this.args.amountOut,
          this.path,
        );
      } catch (e) {
        // console.log("Could not get amounts in");
        return;
      }

      if (amounts[0] > this.args.amountInMax) {
        return;
      }
      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      await this._swap(amounts);
    } else if (this.functionName === "swapTokensForExactTokens") {
      let amounts;
      try {
        amounts = await routerContract.getAmountsIn(
          this.args.amountOut,
          this.path,
        );
      } catch (e) {
        // console.log("Could not get amounts in");
        return;
      }

      if (amounts[0] > this.args.amountInMax) {
        return;
      }
      [this.reserve0, this.reserve1] = await getReserves(
        this.path[0],
        this.path[1],
      );
      await this._swap(amounts);
    }
  }

  display() {
    super.display();
    console.log("amount 0 out: ", this.amount0Out.toString());
    console.log("amount 1 out: ", this.amount1Out.toString());
    console.log("reserve 0: ", this.reserve0.toString());
    console.log("reserve 1: ", this.reserve1.toString());
  }
}

const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

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

function sortTokens(tokenA, tokenB) {
  if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
}

async function getReserves(tokenA, tokenB) {
  try {
    const reserves = await routerContract.getReserves(tokenA, tokenB);
    return reserves;
  } catch (e) {
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
  provider,
  decodeSwapFunction,
  DerivedData,
  SwapData,
};
