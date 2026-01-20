const axios = require("axios");
const { updateTokenMarketData } = require("../tokens/tokenRepository");
const { setTokenMemory, getLatestSnapshot } = require("../state/tokenMemory");
const { saveTokenSnapshot } = require("../tokens/tokenSnapshotRepository");
const { markTokenDead } = require("../tokens/tokenRepository");
const { deleteTokenSnapshots } = require("../tokens/tokenSnapshotRepository");
const { clearTokenMemory } = require("../state/tokenMemory");
const { getApproxHolders } = require("../analysis/holdersService");

const DEX_TOKEN_DETAIL_URL = "https://api.dexscreener.com/latest/dex/tokens/";

function selectPrimaryPair(pairs) {
  return pairs
    .filter(p => p.chainId === "solana")
    .sort(
      (a, b) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];
}

async function updateToken(tokenAddress) {
  try {
    const { data } = await axios.get(
      `${DEX_TOKEN_DETAIL_URL}${tokenAddress}`,
      { timeout: 10000 }
    );

    if (!data.pairs || data.pairs.length === 0) return null;

    const pair = selectPrimaryPair(data.pairs);
    if (!pair) return null;

    const snapshot = {
      price: pair.priceUsd ? Number(pair.priceUsd) : null,
      marketCap: pair.marketCap ?? null,
      volume: pair.volume?.h24 ?? null,
      liquidity: pair.liquidity?.usd ?? null,
      name: pair.baseToken?.name ?? null,
      symbol: pair.baseToken?.symbol ?? null,
      dexId: typeof pair.dexId === "string" && pair.dexId.length > 0 ? pair.dexId : null,
      timestamp: Date.now(),
    };

    const isLowMarketCap = snapshot.marketCap !== null && snapshot.marketCap < 100_000;
    const isLowVolume = snapshot.volume !== null && snapshot.volume < 100_000;
    if (isLowMarketCap || isLowVolume) {
      markTokenDead(tokenAddress);
      deleteTokenSnapshots(tokenAddress);
      clearTokenMemory(tokenAddress);

      console.log(
        `Token marked dead (mc < 100k OR vol < 100k): ${tokenAddress}`,
        {
          marketCap: snapshot.marketCap,
          volume: snapshot.volume,
        }
      );

      return {
        tokenAddress,
        status: "dead",
        snapshot,
      };
    }

    const previous = getLatestSnapshot(tokenAddress);

    let holders = null;

    if (!previous || Date.now() - previous.timestamp > 5 * 60 * 1000) {
      try {
        holders = await getApproxHolders(tokenAddress);
        // Add delay after RPC call to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        if (e.message?.includes('429') || e.message?.includes('rate limit')) {
          console.warn("[RATE LIMIT] Solana RPC rate limited, skipping holders");
        } else {
          console.error("[HOLDERS FETCH FAILED]", tokenAddress, e.message);
        }
        holders = null;
      }
    }

    saveTokenSnapshot({
      tokenAddress,
      price: snapshot.price,
      marketCap: snapshot.marketCap,
      volume: snapshot.volume,
      liquidity: snapshot.liquidity,
      dexId: snapshot.dexId,
      timestamp: snapshot.timestamp,
      holders: holders,
    });

    setTokenMemory(tokenAddress, {
      ...snapshot,
      holders
    });
    updateTokenMarketData(tokenAddress, {
      ...snapshot,
      holders
    });

    return {
      tokenAddress,
      current: snapshot,
      previous,
    };
  } catch (err) {
    console.error(
      `tokenUpdater failed for ${tokenAddress}:`,
      err.message
    );
    return null;
  }
}

module.exports = {
  updateToken,
};