const { ethers } = require("ethers");
const chalk = require("chalk");
const { sortTokens } = require("./utils");
const { getPairAddress, getReserves, routerContract } = require("./contracts");
const ERC20Abi = require("erc-20-abi");

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

module.exports = {
  DerivedData,
  SwapData,
};
