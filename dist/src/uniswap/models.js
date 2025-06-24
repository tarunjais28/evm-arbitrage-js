"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapData = exports.DerivedData = void 0;
const ethers_1 = require("ethers");
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("./utils");
const contracts_1 = require("./contracts");
class DerivedData {
    constructor(functionName, args, path, tokens, recipient, txTo, txFrom, txHash, value, decimals) {
        this.functionName = functionName;
        this.args = args;
        this.path = path;
        this.tokens = tokens;
        this.recipient = recipient;
        this.txTo = txTo || "";
        this.txFrom = txFrom;
        this.txHash = txHash;
        this.poolAddresses = [];
        this.matchingLps = [];
        this.value = value;
        this.decimals = decimals;
    }
    display() {
        const logOutput = [];
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
        logOutput.push(`Value: ${ethers_1.ethers.formatEther(this.value)} ETH`);
        console.log(chalk_1.default.green(logOutput.join("\n")));
    }
}
exports.DerivedData = DerivedData;
class SwapData extends DerivedData {
    constructor(functionName, args, path, tokens, recipient, txTo, txFrom, txHash, value, decimals) {
        super(functionName, args, path, tokens, recipient, txTo, txFrom, txHash, value, decimals);
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
            const reserves = await (0, contracts_1.getReserves)(pool);
            if (reserves) {
                this.reserve0.push(reserves[0]);
                this.reserve1.push(reserves[1]);
            }
        }
    }
    async calcPostReserves() {
        for (let i = 0; i < this.reserve0.length; i++) {
            this.reserve0Post[i] = this.reserve0[i] + this.amount0In[i] - this.amount0Out[i];
            this.reserve1Post[i] = this.reserve1[i] + this.amount1In[i] - this.amount1Out[i];
            const power0 = 10n ** BigInt(this.decimals[i]);
            const power1 = 10n ** BigInt(this.decimals[i + 1]);
            const power2 = 10n ** 20n;
            this.price[i] = (this.reserve1[i] * power0) / (this.reserve0[i] * power1);
            this.pricePost[i] = (this.reserve1Post[i] * power0) / (this.reserve0Post[i] * power1);
            if (this.price[i] === 0n) {
                this.profit[i] = 0n;
            }
            else {
                this.profit[i] = ((this.pricePost[i] - this.price[i]) * power2) / this.price[i];
            }
        }
    }
    async _swap(amounts) {
        for (let i = 0; i < this.path.length - 1; i++) {
            const input = this.path[i];
            const [token0] = (0, utils_1.sortTokens)(input, this.path[i + 1]);
            const amountOut = amounts[i + 1];
            if (input.toLowerCase() === token0.toLowerCase()) {
                this.amount0In.push(amounts[i]);
                this.amount1In.push(0n);
                this.amount0Out.push(0n);
                this.amount1Out.push(amountOut);
            }
            else {
                this.amount0In.push(0n);
                this.amount1In.push(amounts[i]);
                this.amount0Out.push(amountOut);
                this.amount1Out.push(0n);
            }
        }
    }
    async _swapSupportingFeeOnTransferTokens() {
        for (let i = 0; i < this.path.length - 1; i++) {
            const input = this.path[i];
            const output = this.path[i + 1];
            if (input === output && input === ethers_1.ethers.ZeroAddress) {
                continue;
            }
            const [token0] = (0, utils_1.sortTokens)(input, output);
            const pair = await (0, contracts_1.getPairAddress)(input, output);
            if (!pair)
                continue;
            const reserves = await (0, contracts_1.getReserves)(pair);
            if (!reserves)
                continue;
            const [reserve0, reserve1] = reserves;
            const [reserveInput, reserveOutput] = input.toLowerCase() === token0.toLowerCase() ? [reserve0, reserve1] : [reserve1, reserve0];
            const balance = await (0, contracts_1.balanceOf)(input, pair);
            if (balance === null)
                continue;
            const amountInput = balance - reserveInput;
            let amountOut = 0n;
            try {
                amountOut = await contracts_1.routerContract.getAmountOut(amountInput, reserveInput, reserveOutput);
            }
            catch (e) {
                console.log(`INSUFFICIENT_INPUT_AMOUNT`);
                continue;
            }
            if (input.toLowerCase() === token0.toLowerCase()) {
                this.amount0In.push(amountInput);
                this.amount1In.push(0n);
                this.amount0Out.push(0n);
                this.amount1Out.push(amountOut);
            }
            else {
                this.amount0In.push(0n);
                this.amount1In.push(amountInput);
                this.amount0Out.push(amountOut);
                this.amount1Out.push(0n);
            }
        }
    }
    async swap() {
        const functionHandlers = {
            swapETHForExactTokens: async () => {
                if (this.tokens[0] !== "WETH") {
                    console.error(chalk_1.default.red("Not a WETH"));
                    return;
                }
                try {
                    const amounts = await contracts_1.routerContract.getAmountsIn(this.args.amountOut, this.path);
                    if (amounts[0] > this.value) {
                        console.error(chalk_1.default.red("amountIn greater than supplied amount."));
                        return;
                    }
                    await this._swap(amounts);
                }
                catch (e) {
                    console.log(`Could not get amounts in: ${e}`);
                }
            },
            swapExactETHForTokens: async () => {
                if (this.tokens[0] !== "WETH") {
                    console.error(chalk_1.default.red("Not a WETH"));
                    return;
                }
                try {
                    const amounts = await contracts_1.routerContract.getAmountsOut(this.value, this.path);
                    if (amounts[amounts.length - 1] < this.args.amountOutMin) {
                        console.error(chalk_1.default.red("amountOut lesser than amountOutMin."));
                        return;
                    }
                    await this._swap(amounts);
                }
                catch (e) {
                    console.log(`Could not get amounts out: ${e}`);
                }
            },
            swapExactETHForTokensSupportingFeeOnTransferTokens: async () => {
                if (this.tokens[0] !== "WETH") {
                    console.error(chalk_1.default.red("Not a WETH"));
                    return;
                }
                await this._swapSupportingFeeOnTransferTokens();
            },
            swapExactTokensForETH: async () => {
                if (this.tokens[this.tokens.length - 1] !== "WETH") {
                    console.error(chalk_1.default.red("Not a WETH"));
                    return;
                }
                try {
                    const amounts = await contracts_1.routerContract.getAmountsOut(this.args.amountIn, this.path);
                    if (amounts[amounts.length - 1] < this.args.amountOutMin) {
                        console.error(chalk_1.default.red("amountOut lesser than amountOutMin."));
                        return;
                    }
                    await this._swap(amounts);
                }
                catch (e) {
                    console.log(`Could not get amounts out: ${e}`);
                }
            },
            swapExactTokensForETHSupportingFeeOnTransferTokens: async () => {
                if (this.tokens[this.tokens.length - 1] !== "WETH") {
                    console.error(chalk_1.default.red("Not a WETH"));
                    return;
                }
                await this._swapSupportingFeeOnTransferTokens();
            },
            swapExactTokensForTokens: async () => {
                try {
                    const amounts = await contracts_1.routerContract.getAmountsOut(this.args.amountIn, this.path);
                    if (amounts[amounts.length - 1] < this.args.amountOutMin) {
                        console.error(chalk_1.default.red("amountOut lesser than amountOutMin."));
                        return;
                    }
                    await this._swap(amounts);
                }
                catch (e) {
                    console.log(`Could not get amounts out: ${e}`);
                }
            },
            swapExactTokensForTokensSupportingFeeOnTransferTokens: async () => {
                await this._swapSupportingFeeOnTransferTokens();
            },
            swapTokensForExactETH: async () => {
                if (this.tokens[this.tokens.length - 1] !== "WETH") {
                    console.error(chalk_1.default.red("Not a WETH"));
                    return;
                }
                try {
                    const amounts = await contracts_1.routerContract.getAmountsIn(this.args.amountOut, this.path);
                    if (amounts[0] > this.args.amountInMax) {
                        console.error(chalk_1.default.red("amountIn greater than amountInMax."));
                        return;
                    }
                    await this._swap(amounts);
                }
                catch (e) {
                    console.log(`Could not get amounts in: ${e}`);
                }
            },
            swapTokensForExactTokens: async () => {
                try {
                    const amounts = await contracts_1.routerContract.getAmountsIn(this.args.amountOut, this.path);
                    if (amounts[0] > this.args.amountInMax) {
                        console.error(chalk_1.default.red("amountIn greater than amountInMax."));
                        return;
                    }
                    await this._swap(amounts);
                }
                catch (e) {
                    console.log(`Could not get amounts in: ${e}`);
                }
            },
        };
        const handler = functionHandlers[this.functionName];
        if (handler) {
            await handler();
        }
        await this.getReserveBalances();
        await this.calcPostReserves();
    }
    display() {
        super.display();
        const logOutput = [];
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
        console.log(chalk_1.default.green(logOutput.join("\n")));
    }
}
exports.SwapData = SwapData;
