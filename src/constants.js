const swapFunctions = {
  swapETHForExactTokens: ["amountOut"],
  swapExactETHForTokens: ["amountOutMin"],
  swapExactETHForTokensSupportingFeeOnTransferTokens: ["amountOutMin"],
  swapExactTokensForETH: ["amountIn", "amountOutMin"],
  swapExactTokensForETHSupportingFeeOnTransferTokens: [
    "amountIn",
    "amountOutMin",
  ],
  swapExactTokensForTokens: ["amountIn", "amountOutMin"],
  swapExactTokensForTokensSupportingFeeOnTransferTokens: [
    "amountIn",
    "amountOutMin",
  ],
  swapTokensForExactETH: ["amountOut", "amountInMax"],
  swapTokensForExactTokens: ["amountOut", "amountInMax"],
};

const funcNames = [
  "swapETHForExactTokens",
  "swapExactETHForTokens",
  "swapExactETHForTokensSupportingFeeOnTransferTokens",
  "swapExactTokensForETH",
  "swapExactTokensForETHSupportingFeeOnTransferTokens",
  "swapExactTokensForTokens",
  "swapExactTokensForTokensSupportingFeeOnTransferTokens",
  "swapTokensForExactETH",
  "swapTokensForExactTokens",
];

const tokenAddressToSymbol = new Map([
  ["0xdbdb4d16eda451d0503b854cf79d55697f90c8df".toLowerCase(), "ALCX"],
  ["0x6b175474e89094c44da98b954eedeac495271d0f".toLowerCase(), "DAI"],
  ["0x419c4db4b9e25d6db2ad9691ccb832c8d9fda05e".toLowerCase(), "DRGN"],
  ["0x9ab7bb7fdc60f4357ecfef43986818a2a3569c62".toLowerCase(), "GOG"],
  ["0x767fe9edc9e0df98e07454847909b5e959d7ca0e".toLowerCase(), "ILV"],
  ["0x514910771af9ca656af840dff83e8264ecf986ca".toLowerCase(), "LINK"],
  ["0x3131ae663eef833e77dfa1d618536b07e191b31d".toLowerCase(), "NFD"],
  ["0x45804880de22913dafe09f4980848ece6ecbaf78".toLowerCase(), "PAXG"],
  ["0xee7527841a932d2912224e20a405e1a1ff747084".toLowerCase(), "SHX"],
  ["0x6b3595068778dd592e39a122f4f5a5cf09c90fe2".toLowerCase(), "SUSHI"],
  ["0x2e9d63788249371f1dfc918a52f8d799f4a38c94".toLowerCase(), "TOKE"],
  ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48".toLowerCase(), "USDC"],
  ["0xdac17f958d2ee523a2206206994597c13d831ec7".toLowerCase(), "USDT"],
  ["0x2260fac5e5542a773aa44fbcfedf7c193bc2c599".toLowerCase(), "WBTC"],
  ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase(), "WETH"],
]);

const pairMap = new Map();

function makeKey(tokenA, tokenB) {
  return [tokenA, tokenB].sort().join("-");
}

pairMap.set(makeKey("DAI", "WETH"), [
  "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f".toLowerCase(),
]);
pairMap.set(makeKey("DAI", "ETH"), [
  "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11".toLowerCase(),
]);
pairMap.set(makeKey("DRGN", "WETH"), [
  "0xe0a0De6a56a79F45669f15B467DbeB4649ae67E2".toLowerCase(),
]);
pairMap.set(makeKey("GOG", "WETH"), [
  "0x5c596C6a65f628Fc1090853D8eB1927651E9d9B2".toLowerCase(),
]);
pairMap.set(makeKey("ILV", "WETH"), [
  "0x6a091a3406E0073C3CD6340122143009aDac0EDa".toLowerCase(),
]);
pairMap.set(makeKey("LINK", "ETH"), [
  "0xa2107FA5B38d9bbd2C461D6EDf11B11A50F6b974".toLowerCase(),
  "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967".toLowerCase(),
]);
pairMap.set(makeKey("SUSHI", "WETH"), [
  "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0".toLowerCase(),
]);
pairMap.set(makeKey("TOKE", "WETH"), [
  "0xd4e7a6e2D03e4e48DfC27dd3f46DF1c176647E38".toLowerCase(),
]);
pairMap.set(makeKey("USDC", "WETH"), [
  "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0".toLowerCase(),
]);
pairMap.set(makeKey("USDC", "ETH"), [
  "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc".toLowerCase(),
]);
pairMap.set(makeKey("WBTC", "WETH"), [
  "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58".toLowerCase(),
  "0xBb2b8038a1640196FbE3e38816F3e67Cba72D940".toLowerCase(),
]);
pairMap.set(makeKey("WETH", "ALCX"), [
  "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8".toLowerCase(),
]);
pairMap.set(makeKey("WETH", "SHX"), [
  "0xEa59A3Da9CaD8ECE406a353DDEde0e7D17604d28".toLowerCase(),
  "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852".toLowerCase(),
]);
pairMap.set(makeKey("WETH", "NFD"), [
  "0xeEFA3b448768dD561Af4F743C9e925987A1F8D09".toLowerCase(),
]);
pairMap.set(makeKey("PAXG", "WETH"), [
  "0xf957FC1B6Ed557c698Ed6f1D336e00f306773975".toLowerCase(),
  "0x9C4Fe5FFD9A9fC5678cFBd93Aa2D4FD684b67C4C".toLowerCase(),
]);

module.exports = {
  swapFunctions,
  funcNames,
  tokenAddressToSymbol,
  pairMap,
  makeKey,
};
