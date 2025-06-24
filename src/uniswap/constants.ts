const factoryAddress: string = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const routerAddress: string = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const swapFunctions: { [key: string]: string[] } = {
  swapExactTokensForTokens: [
    "amountIn",
    "amountOutMin",
    "path",
    "to",
    "deadline",
  ],
  swapTokensForExactTokens: [
    "amountOut",
    "amountInMax",
    "path",
    "to",
    "deadline",
  ],
  swapExactETHForTokens: ["amountOutMin", "path", "to", "deadline"],
  swapTokensForExactETH: ["amountOut", "amountInMax", "path", "to", "deadline"],
  swapExactTokensForETH: ["amountIn", "amountOutMin", "path", "to", "deadline"],
  swapETHForExactTokens: ["amountOut", "path", "to", "deadline"],
  swapExactTokensForTokensSupportingFeeOnTransferTokens: [
    "amountIn",
    "amountOutMin",
    "path",
    "to",
    "deadline",
  ],
  swapExactETHForTokensSupportingFeeOnTransferTokens: [
    "amountOutMin",
    "path",
    "to",
    "deadline",
  ],
  swapExactTokensForETHSupportingFeeOnTransferTokens: [
    "amountIn",
    "amountOutMin",
    "path",
    "to",
    "deadline",
  ],
};

const funcNames: string[] = Object.keys(swapFunctions);

export { factoryAddress, routerAddress, swapFunctions, funcNames };
