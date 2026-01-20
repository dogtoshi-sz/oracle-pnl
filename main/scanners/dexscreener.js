const axios = require("axios");

const DEXSCREENER_BOOSTS_URL =
  "https://api.dexscreener.com/token-boosts/top/v1";

async function fetchDexscreenerBoosts() {
  try {
    const { data } = await axios.get(DEXSCREENER_BOOSTS_URL, {
      timeout: 10000,
    });

    if (!Array.isArray(data)) return [];

    return data
      .filter(t => t.chainId === "solana")
      .map(t => ({
        tokenAddress: t.tokenAddress,
        chain: "solana",
        name: null,
        symbol: null,
        source: null,
        links: t.links || [],
        boostedAmount: t.totalAmount || 0,
      }));
  } catch (err) {
    console.error("dexscreener scan failed:", err.message);
    return [];
  }
}

module.exports = {
  fetchDexscreenerBoosts,
};