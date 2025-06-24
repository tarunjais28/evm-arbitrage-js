export function sortTokens(tokenA: string, tokenB: string): [string, string] {
  if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
}
