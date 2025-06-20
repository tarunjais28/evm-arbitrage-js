const { ethers } = require("ethers");
const chalk = require("chalk");
const { sortTokens } = require("./utils");
const {
  getPairAddress,
  getReserves,
  routerContract,
  balanceOf,
} = require("./contracts");

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
    this.amount0In = 0;
    this.amount1In = 0;
    this.amount0Out = 0;
    this.amount1Out = 0;
    this.reserve0 = [];
    this.reserve1 = [];
  }

  async _swap(amounts) {
    for (let i = 0; i < this.path.length - 1; i++) {
      const input = this.path[i];
      const [token0] = sortTokens(input, this.path[i + 1]);
      const amountOut = amounts[i + 1];
      if (input.toLowerCase() === token0.toLowerCase()) {
        this.amount0In = this.value;
        this.amount1In = 0;
        this.amount0Out = 0;
        this.amount1Out = amountOut;
      } else {
        this.amount0In = 0;
        this.amount1In = this.value;
        this.amount0Out = amountOut;
        this.amount1Out = 0;
      }
    }
  }

  async getReserveBalances() {
    for (const pool of this.poolAddresses) {
      let [reserve0, reserve1] = await getReserves(pool);
      this.reserve0.push(reserve0);
      this.reserve1.push(reserve1);
    }
  }

  async _swapSupportingFeeOnTransferTokens() {
    for (let i = 0; i < this.path.length - 1; i++) {
      const input = this.path[i];
      const output = this.path[i + 1];

      if (input == output && input == ethers.ZeroAddress) {
        continue;
      }

      const [token0] = sortTokens(input, output);

      let pair = await getPairAddress(input, output);
      let [reserve0, reserve1] = await getReserves(pair);
      
      let [reserveInput, reserveOutput] =
        input == token0 ? [reserve0, reserve1] : [reserve1, reserve0];

      const balance = await balanceOf(input, pair);
      let amountInput = balance - reserveInput;
      let amountOut = 0;

      try {
        amountOut = await routerContract.getAmountOut(
          amountInput,
          reserveInput,
          reserveOutput,
        );
      } catch (e) {
        console.log(`INSUFFICIENT_INPUT_AMOUNT`);
        continue;
      }

      if (input.toLowerCase() === token0.toLowerCase()) {
          this.amount0In = this.value;
          this.amount1In = 0;
          this.amount0Out = 0;
          this.amount1Out = amountOut;
        } else {
          this.amount0In = 0;
          this.amount1In = this.value;
          this.amount0Out = amountOut;
          this.amount1Out = 0;
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
        console.log(`Could not get amounts in: ${e}`);
        return;
      }

      if (amounts[0] > this.value) {
        return;
      }

      await this.getReserveBalances();
      await this._swap(amounts);
    } else if (this.functionName === "swapExactETHForTokens") {
      if (this.tokens[0] !== "WETH") {
        return;
      }
      let amounts;
      try {
        amounts = await routerContract.getAmountsOut(
          this.value,
          this.path,
        );
      } catch (e) {
        console.log(`Could not get amounts in: ${e}`);
        return;
      }

      if (amounts[amounts.length - 1] < this.args.amountOutMin) {
        return;
      }

      await this.getReserveBalances();
      await this._swap(amounts);
    } else if (
      this.functionName === "swapExactETHForTokensSupportingFeeOnTransferTokens"
    ) {
      if (this.tokens[0] !== "WETH") {
        return;
      }

      await this.getReserveBalances();
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
        console.log(`Could not get amounts in: ${e}`);
        return;
      }

      if (amounts[amounts.length - 1] < this.args.amountOutMin) {
        return;
      }

      await this.getReserveBalances();
      await this._swap(amounts);
    } else if (
      this.functionName === "swapExactTokensForETHSupportingFeeOnTransferTokens"
    ) {
      if (this.tokens[this.tokens.length - 1] !== "WETH") {
        return;
      }

      await this.getReserveBalances();
      await this._swapSupportingFeeOnTransferTokens();
    } else if (this.functionName === "swapExactTokensForTokens") {
      let amounts;
      try {
        amounts = await routerContract.getAmountsOut(
          this.args.amountIn,
          this.path,
        );
      } catch (e) {
        console.log(`Could not get amounts out: ${e}`);
        return;
      }

      if (amounts[amounts.length - 1] < this.args.amountOutMin) {
        return;
      }

      await this.getReserveBalances();
      await this._swap(amounts);
    } else if (
      this.functionName ===
      "swapExactTokensForTokensSupportingFeeOnTransferTokens"
    ) {
      await this.getReserveBalances();
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
        console.log(`Could not get amounts in: ${e}`);
        return;
      }

      if (amounts[0] > this.args.amountInMax) {
        return;
      }
      await this.getReserveBalances();
      await this._swap(amounts);
    } else if (this.functionName === "swapTokensForExactTokens") {
      let amounts;
      try {
        amounts = await routerContract.getAmountsIn(
          this.args.amountOut,
          this.path,
        );
      } catch (e) {
        console.log(`Could not get amounts in: ${e}`);
        return;
      }

      if (amounts[0] > this.args.amountInMax) {
        return;
      }
      await this.getReserveBalances();
      await this._swap(amounts);
    }
  }

  display() {
    super.display();

    let logOutput = [];

    logOutput.push(`amount0In: ${this.amount0In.toString()}`);
    logOutput.push(`amount1In: ${this.amount1In.toString()}`);
    logOutput.push(`amount0Out: ${this.amount0Out.toString()}`);
    logOutput.push(`amount1Out: ${this.amount1Out.toString()}`);
    logOutput.push(`reserve0: ${this.reserve0.toString()}`);
    logOutput.push(`reserve1: ${this.reserve1.toString()}`);

    logOutput.push("=".repeat(100));
    console.log(chalk.green(logOutput.join("\n")));
  }
}

module.exports = {
  DerivedData,
  SwapData,
};
