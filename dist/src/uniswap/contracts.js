"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iface = exports.routerContract = exports.factoryContract = exports.provider = void 0;
exports.getPairAddress = getPairAddress;
exports.getReserves = getReserves;
exports.balanceOf = balanceOf;
const ethers_1 = require("ethers");
const IUniswapV2Factory_json_1 = __importDefault(require("@uniswap/v2-core/build/IUniswapV2Factory.json"));
const IUniswapV2Router02_json_1 = __importDefault(require("@uniswap/v2-periphery/build/IUniswapV2Router02.json"));
const constants_1 = require("./constants");
const UniswapPair_json_1 = __importDefault(require("eth-abis/abis/UniswapPair.json"));
const erc_20_abi_1 = __importDefault(require("erc-20-abi"));
require("dotenv/config");
if (!process.env.WEBSOCKET_ENDPOINT) {
    throw new Error("WEBSOCKET_ENDPOINT is not set in the environment variables. Please check your .env file.");
}
const provider = new ethers_1.ethers.WebSocketProvider(process.env.WEBSOCKET_ENDPOINT);
exports.provider = provider;
const factoryContract = new ethers_1.ethers.Contract(constants_1.factoryAddress, IUniswapV2Factory_json_1.default.abi, provider);
exports.factoryContract = factoryContract;
const routerContract = new ethers_1.ethers.Contract(constants_1.routerAddress, IUniswapV2Router02_json_1.default.abi, provider);
exports.routerContract = routerContract;
const iface = new ethers_1.ethers.Interface(IUniswapV2Router02_json_1.default.abi);
exports.iface = iface;
async function getPairAddress(tokenA, tokenB) {
    try {
        const pairAddress = await factoryContract.getPair(tokenA, tokenB);
        if (pairAddress === ethers_1.ethers.ZeroAddress) {
            return null; // Pair does not exist
        }
        return pairAddress;
    }
    catch (e) {
        console.error("Error in getPairAddress:", e);
        return null;
    }
}
async function getReserves(pairAddress) {
    try {
        const pairContract = new ethers_1.ethers.Contract(pairAddress, UniswapPair_json_1.default, provider);
        const [reserve0, reserve1] = await pairContract.getReserves();
        return [BigInt(reserve0), BigInt(reserve1)];
    }
    catch (e) {
        console.error(`Error in getReserves for pair ${pairAddress}:`, e);
        return null;
    }
}
async function balanceOf(contractAddress, address) {
    try {
        const contract = new ethers_1.ethers.Contract(contractAddress, erc_20_abi_1.default, provider);
        const balance = await contract.balanceOf(address);
        return balance;
    }
    catch (e) {
        console.error(`Error in balanceOf for ${address} on contract ${contractAddress}:`, e);
        return null;
    }
}
