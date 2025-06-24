"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provider = exports.decodeSwapFunction = void 0;
const ethers_1 = require("ethers");
const models_1 = require("./uniswap/models");
const contracts_1 = require("./uniswap/contracts");
Object.defineProperty(exports, "provider", { enumerable: true, get: function () { return contracts_1.provider; } });
const constants_1 = require("./uniswap/constants");
const erc_20_abi_1 = __importDefault(require("erc-20-abi"));
const chalk_1 = __importDefault(require("chalk"));
const decodeSwapFunction = async (tx, contracts) => {
    try {
        const selector = tx.data.slice(0, 10);
        let matched = null;
        for (const name of constants_1.funcNames) {
            const func = contracts_1.iface.getFunction(name);
            if (func && selector === func.selector) {
                matched = func;
                break;
            }
        }
        if (!matched) {
            return;
        }
        const decoded = contracts_1.iface.decodeFunctionData(matched.name, tx.data);
        if (!decoded.path || !Array.isArray(decoded.path)) {
            return;
        }
        const pathStrings = decoded.path.map((p) => String(p));
        const symbols = [];
        const decimals = [];
        for (const path of pathStrings) {
            const token = new ethers_1.ethers.Contract(path, erc_20_abi_1.default, contracts_1.provider);
            try {
                const symbol = await token.symbol();
                symbols.push(symbol);
                const decimal = await token.decimals();
                decimals.push(Number(decimal));
            }
            catch (error) {
                console.error(chalk_1.default.red(`Error fetching details for token ${path}:`), error);
            }
        }
        const swapData = new models_1.SwapData(matched.name, {}, pathStrings.map((a) => a.toLowerCase()), symbols, decoded.to || null, tx.to, tx.from, tx.hash, tx.value, decimals);
        const argNames = constants_1.swapFunctions[swapData.functionName] || [];
        argNames.forEach((name, idx) => {
            if (decoded[idx] !== undefined) {
                swapData.args[name] = decoded[idx].toString();
            }
        });
        for (let i = 0; i < swapData.path.length - 1; i++) {
            const address = await (0, contracts_1.getPairAddress)(swapData.path[i], swapData.path[i + 1]);
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
    }
    catch (error) {
        console.error(chalk_1.default.red("Error in decodeSwapFunction:", error, JSON.stringify(tx, null, 2)));
    }
};
exports.decodeSwapFunction = decodeSwapFunction;
