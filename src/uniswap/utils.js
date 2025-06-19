function sortTokens(tokenA, tokenB) {
  if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
}

module.exports = {
  sortTokens,
};
