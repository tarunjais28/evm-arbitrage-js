import { ethers, Contract, Interface, WebSocketProvider } from "ethers";
import IUniswapV2Factory from "@uniswap/v2-core/build/IUniswapV2Factory.json";
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import { factoryAddress, routerAddress } from "./constants";
import UniswapPairAbi from "eth-abis/abis/UniswapPair.json";
import ERC20Abi from "erc-20-abi";
import "dotenv/config";

if (!process.env.WEBSOCKET_ENDPOINT) {
  throw new Error(
    "WEBSOCKET_ENDPOINT is not set in the environment variables. Please check your .env file.",
  );
}

const provider: WebSocketProvider = new ethers.WebSocketProvider(
  process.env.WEBSOCKET_ENDPOINT,
);

const factoryContract: Contract = new ethers.Contract(
  factoryAddress,
  IUniswapV2Factory.abi,
  provider,
);

const routerContract: Contract = new ethers.Contract(
  routerAddress,
  IUniswapV2Router02.abi,
  provider,
);

const iface: Interface = new ethers.Interface(IUniswapV2Router02.abi);

async function getPairAddress(
  tokenA: string,
  tokenB: string,
): Promise<string | null> {
  try {
    const pairAddress: string = await factoryContract.getPair(tokenA, tokenB);
    if (pairAddress === ethers.ZeroAddress) {
      return null; // Pair does not exist
    }
    return pairAddress;
  } catch (e) {
    console.error("Error in getPairAddress:", e);
    return null;
  }
}

async function getReserves(
  pairAddress: string,
): Promise<[bigint, bigint] | null> {
  try {
    const pairContract = new ethers.Contract(
      pairAddress,
      UniswapPairAbi,
      provider,
    );
    const [reserve0, reserve1] = await pairContract.getReserves();
    return [BigInt(reserve0), BigInt(reserve1)];
  } catch (e) {
    console.error(`Error in getReserves for pair ${pairAddress}:`, e);
    return null;
  }
}

async function balanceOf(
  contractAddress: string,
  address: string,
): Promise<bigint | null> {
  try {
    const contract = new ethers.Contract(contractAddress, ERC20Abi, provider);
    const balance: bigint = await contract.balanceOf(address);
    return balance;
  } catch (e) {
    console.error(
      `Error in balanceOf for ${address} on contract ${contractAddress}:`,
      e,
    );
    return null;
  }
}

export {
  provider,
  factoryContract,
  routerContract,
  iface,
  getPairAddress,
  getReserves,
  balanceOf,
};
