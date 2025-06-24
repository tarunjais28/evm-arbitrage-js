"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortTokens = sortTokens;
function sortTokens(tokenA, tokenB) {
    if (tokenA.toLowerCase() < tokenB.toLowerCase()) {
        return [tokenA, tokenB];
    }
    return [tokenB, tokenA];
}
