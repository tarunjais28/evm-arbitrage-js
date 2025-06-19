const { ethers } = require("ethers");
const UniswapPair = require("eth-abis/abis/UniswapPair.json");
require("dotenv").config();

const provider = new ethers.WebSocketProvider(process.env.WEBSOCKET_ENDPOINT);

async function fetchPools() {
  const pairContract = new ethers.Contract(
    "0xceff51756c56ceffca006cd410b03ffc46dd3a58",
    UniswapPair,
    provider,
  );

  let [reserve0, reserve1, _] = await pairContract.getReserves();
  console.log(reserve0, reserve1);
}

// Wrap in self-invoking async function
(async () => {
  try {
    await fetchPools();
  } catch (err) {
    console.error("Unexpected error:", err.message);
  } finally {
    provider.destroy(); // Close the WebSocket connection
  }
})();
