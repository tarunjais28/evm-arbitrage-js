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
    decimals,
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
    this.decimals = decimals;
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
    logOutput.push(`decimals: ${this.decimals.toString()}`);
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
    decimals,
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
      decimals,
    );
    this.amount0In = [];
    this.amount1In = [];
    this.amount0Out = [];
    this.amount1Out = [];
    this.reserve0 = [];
    this.reserve1 = [];
    this.reserve0Post = [];
    this.reserve1Post = [];
    this.price = [];
    this.pricePost = [];
    this.profit = [];
  }

  async getReserveBalances() {
    for (const pool of this.poolAddresses) {
      let [reserve0, reserve1] = await getReserves(pool);
      this.reserve0.push(reserve0);
      this.reserve1.push(reserve1);
    }
  }

  async calcPostReserves() {
    for (let i = 0; i < this.reserve0.length; i++) {
      this.reserve0Post[i] =
        this.reserve0[i] + this.amount0In[i] - this.amount0Out[i];
      this.reserve1Post[i] =
        this.reserve1[i] + this.amount1In[i] - this.amount1Out[i];

      this.price[i] =
        (this.reserve1[i] * Math.pow(10, this.decimals[i])) /
        (this.reserve0[i] * Math.pow(10, this.decimals[i + 1]));

      this.pricePost[i] =
        (this.reserve1Post[i] * Math.pow(10, this.decimals[i])) /
        (this.reserve0Post[i] * Math.pow(10, this.decimals[i + 1]));

      if (this.price[i] == 0) {
        this.profit[i] = 0;
      } else {
        this.profit[i] =
          ((this.pricePost[i] - this.price[i]) * 100) / this.price[i];
      }
    }
  }

  async _swap(amounts) {
    for (let i = 0; i < this.path.length - 1; i++) {
      const input = this.path[i];
      const [token0] = sortTokens(input, this.path[i + 1]);
      const amountOut = amounts[i + 1];
      if (input.toLowerCase() === token0.toLowerCase()) {
        this.amount0In.push(amounts[i]);
        this.amount1In.push(0);
        this.amount0Out.push(0);
        this.amount1Out.push(amountOut);
      } else {
        this.amount0In.push(0);
        this.amount1In.push(amounts[i]);
        this.amount0Out.push(amountOut);
        this.amount1Out.push(0);
      }
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
        this.amount0In.push(amountInput);
        this.amount1In.push(0);
        this.amount0Out.push(0);
        this.amount1Out.push(amountOut);
      } else {
        this.amount0In.push(0);
        this.amount1In.push(amountInput);
        this.amount0Out.push(amountOut);
        this.amount1Out.push(0);
      }
    }
  }

  async swap() {
    if (this.functionName === "swapETHForExactTokens") {
      if (this.tokens[0] !== "WETH") {
        console.error(chalk.red("Not a WETH"));
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
        console.error(chalk.red("amountIn greater than supplied amount."));
        return;
      }

      await this._swap(amounts);
    } else if (this.functionName === "swapExactETHForTokens") {
      if (this.tokens[0] !== "WETH") {
        console.error(chalk.red("Not a WETH"));
        return;
      }
      let amounts;
      try {
        amounts = await routerContract.getAmountsOut(this.value, this.path);
      } catch (e) {
        console.log(`Could not get amounts in: ${e}`);
        return;
      }

      if (amounts[amounts.length - 1] < this.args.amountOutMin) {
        console.error(chalk.red("amountOut lesser than amountOutMin."));
        return;
      }

      await this._swap(amounts);
    } else if (
      this.functionName === "swapExactETHForTokensSupportingFeeOnTransferTokens"
    ) {
      if (this.tokens[0] !== "WETH") {
        console.error(chalk.red("Not a WETH"));
        return;
      }

      await this._swapSupportingFeeOnTransferTokens();
    } else if (this.functionName === "swapExactTokensForETH") {
      if (this.tokens[this.tokens.length - 1] !== "WETH") {
        console.error(chalk.red("Not a WETH"));
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
        console.error(chalk.red("amountOut lesser than amountOutMin."));
        return;
      }

      await this._swap(amounts);
    } else if (
      this.functionName === "swapExactTokensForETHSupportingFeeOnTransferTokens"
    ) {
      if (this.tokens[this.tokens.length - 1] !== "WETH") {
        console.error(chalk.red("Not a WETH"));
        return;
      }

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
        console.error(chalk.red("amountOut lesser than amountOutMin."));
        return;
      }

      await this._swap(amounts);
    } else if (
      this.functionName ===
      "swapExactTokensForTokensSupportingFeeOnTransferTokens"
    ) {
      await this._swapSupportingFeeOnTransferTokens();
    } else if (this.functionName === "swapTokensForExactETH") {
      if (this.tokens[this.tokens.length - 1] !== "WETH") {
        console.error(chalk.red("Not a WETH"));
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
        console.error(chalk.red("amountIn greater than amountInMax."));
        return;
      }

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
        console.error(chalk.red("amountIn greater than amountInMax."));
        return;
      }
      console.log(`amounts: ${amounts}`);
      await this._swap(amounts);
    }
    await this.getReserveBalances();
    await this.calcPostReserves();
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
    logOutput.push(`reserve0Post: ${this.reserve0Post.toString()}`);
    logOutput.push(`reserve1Post: ${this.reserve1Post.toString()}`);
    logOutput.push(`price: ${this.price.toString()}`);
    logOutput.push(`pricePost: ${this.pricePost.toString()}`);
    logOutput.push(`profit: ${this.profit.toString()}`);

    logOutput.push("=".repeat(100));
    console.log(chalk.green(logOutput.join("\n")));
  }
}

module.exports = {
  DerivedData,
  SwapData,
};
