import { ethers, FunctionFragment, Result } from "ethers";
import { SwapData } from "./uniswap/models";
import { iface, getPairAddress, provider } from "./uniswap/contracts";
import { funcNames, swapFunctions } from "./uniswap/constants";
import ERC20Abi from "erc-20-abi";
import chalk from "chalk";

// A simplified interface for the transaction object to ensure type safety for used properties.
interface DecodableTransaction {
  data: string;
  to: string | null;
  from: string;
  hash: string;
  value: bigint;
}

const decodeSwapFunction = async (
  tx: DecodableTransaction,
  contracts: string[],
): Promise<void> => {
  try {
    const selector: string = tx.data.slice(0, 10);
    let matched: FunctionFragment | null = null;

    for (const name of funcNames) {
      const func = iface.getFunction(name);
      if (func && selector === func.selector) {
        matched = func;
        break;
      }
    }

    if (!matched) {
      return;
    }

    const decoded: Result = iface.decodeFunctionData(matched.name, tx.data);

    if (!decoded.path || !Array.isArray(decoded.path)) {
      return;
    }

    const pathStrings: string[] = decoded.path.map((p: any) => String(p));

    const symbols: string[] = [];
    const decimals: number[] = [];

    for (const path of pathStrings) {
      const token = new ethers.Contract(path, ERC20Abi, provider);
      try {
        const symbol: string = await token.symbol();
        symbols.push(symbol);

        const decimal: bigint = await token.decimals();
        decimals.push(Number(decimal));
      } catch (error) {
        console.error(
          chalk.red(`Error fetching details for token ${path}:`),
          error,
        );
      }
    }

    const swapData = new SwapData(
      matched.name,
      {},
      pathStrings.map((a: string) => a.toLowerCase()),
      symbols,
      decoded.to || null,
      tx.to,
      tx.from,
      tx.hash,
      tx.value,
      decimals,
    );

    const argNames: string[] = swapFunctions[swapData.functionName] || [];
    argNames.forEach((name: string, idx: number) => {
      if (decoded[idx] !== undefined) {
        swapData.args[name] = decoded[idx].toString();
      }
    });

    for (let i = 0; i < swapData.path.length - 1; i++) {
      const address: string | null = await getPairAddress(
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
    console.error(
      chalk.red(
        "Error in decodeSwapFunction:",
        error,
        JSON.stringify(tx, null, 2),
      ),
    );
  }
};

export { decodeSwapFunction, provider };
