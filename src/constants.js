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

module.exports = {
  swapFunctions,
  funcNames,
};
