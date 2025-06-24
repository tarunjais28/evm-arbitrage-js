const swapFunctions: { [key: string]: string[] } = {
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

const funcNames: string[] = [
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

export { swapFunctions, funcNames };
