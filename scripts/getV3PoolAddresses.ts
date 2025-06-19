import { abi as IUniswapV3Factory } from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const factoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

const websocketEndpoint = process.env.WEBSOCKET_ENDPOINT;
if (!websocketEndpoint) {
  throw new Error("Missing WEBSOCKET_ENDPOINT in .env");
}

const provider = new ethers.WebSocketProvider(websocketEndpoint);

const factoryContract = new ethers.Contract(
  factoryAddress,
  IUniswapV3Factory,
  provider
) as ethers.Contract;

const symbols: string[] = [
  "ALCX", "DAI", "DRGN", "GOG", "ILV", "LINK", "NFD", "PAXG",
  "SHX", "SUSHI", "TOKE", "USDC", "USDT", "WBTC", "WETH"
];

const symbolToTokenAddress: Map<string, string> = new Map([
  ["ALCX", "0xdbdb4d16eda451d0503b854cf79d55697f90c8df"],
  ["DAI", "0x6b175474e89094c44da98b954eedeac495271d0f"],
  ["DRGN", "0x419c4db4b9e25d6db2ad9691ccb832c8d9fda05e"],
  ["GOG", "0x9ab7bb7fdc60f4357ecfef43986818a2a3569c62"],
  ["ILV", "0x767fe9edc9e0df98e07454847909b5e959d7ca0e"],
  ["LINK", "0x514910771af9ca656af840dff83e8264ecf986ca"],
  ["NFD", "0x3131ae663eef833e77dfa1d618536b07e191b31d"],
  ["PAXG", "0x45804880de22913dafe09f4980848ece6ecbaf78"],
  ["SHX", "0xee7527841a932d2912224e20a405e1a1ff747084"],
  ["SUSHI", "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2"],
  ["TOKE", "0x2e9d63788249371f1dfc918a52f8d799f4a38c94"],
  ["USDC", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
  ["USDT", "0xdac17f958d2ee523a2206206994597c13d831ec7"],
  ["WBTC", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"],
  ["WETH", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"],
]);

const feePercent: number[] = [100, 500, 3000, 10000];

function sortAddresses(tokenA: string, tokenB: string): [string, string] {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

async function fetchPools(): Promise<void> {
  const tasks: Promise<void>[] = [];

  for (let i = 2; i < symbols.length - 1; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const token0 = symbols[i];
      const token1 = symbols[j];

      const token0Address = symbolToTokenAddress.get(token0);
      const token1Address = symbolToTokenAddress.get(token1);

      if (!token0Address || !token1Address) {
        console.warn(`Missing address for ${token0} or ${token1}`);
        continue;
      }

      const [token0Sorted, token1Sorted] = sortAddresses(token0Address, token1Address);

      for (const fee of feePercent) {
        const task = factoryContract.getPool(token0Sorted, token1Sorted, fee)
          .then((addr: string) => {
            if (addr !== ethers.ZeroAddress) {
              console.log(`${token0}, ${token1}, ${fee}, ${addr}`);
            }
          })
          .catch((err: any) => {
            console.log(`Error: ${token0}, ${token1}, ${fee}`, err?.message || err);
          });

        tasks.push(task);
      }
    }
  }

  await Promise.allSettled(tasks);
}

// Run the script
(async () => {
  try {
    await fetchPools();
  } catch (err: any) {
    console.error("Unexpected error:", err.message || err);
  } finally {
    provider.destroy(); // Close WebSocket
  }
})();
