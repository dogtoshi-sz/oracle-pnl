const axios = require("axios");

const PUMPFUN_RUNNERS_URL = "https://pump.fun/api/runners";

async function fetchPumpfunRunners() {
  try {
    const { data } = await axios.get(PUMPFUN_RUNNERS_URL, {
      timeout: 10000,
    });

    if (!Array.isArray(data)) return [];

    return data.map(r => ({
      tokenAddress: r.coin.mint,
      chain: "solana",
      name: r.coin.name || null,
      symbol: r.coin.symbol || null,
      source: "pumpswap",
      marketCapUsd: r.coin.usd_market_cap || null,
      isLive: r.coin.is_currently_live,
      createdAt: r.coin.created_timestamp,
    }));
  } catch (err) {
    console.error("pumpswap scan failed:", err.message);
    return [];
  }
}

module.exports = {
  fetchPumpfunRunners,
};