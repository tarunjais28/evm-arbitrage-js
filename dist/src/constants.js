"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.funcNames = exports.swapFunctions = void 0;
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
exports.swapFunctions = swapFunctions;
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
exports.funcNames = funcNames;
