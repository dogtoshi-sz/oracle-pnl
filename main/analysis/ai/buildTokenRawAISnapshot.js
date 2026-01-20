const { getDb } = require("../../database");
const { buildDeltas } = require("./calculateDeltas");
const { analyzeHolders } = require("./analyzeHolders");
const { analyzeTrend, analyzeVolatility } = require("./analyzePriceStructure");

const db = getDb();

function buildTokenRawAISnapshot(tokenAddress) {
  const candles15m = db.prepare(`
    SELECT open, high, low, close, volume
    FROM tokenCandles
    WHERE tokenAddress = ?
      AND timeframe = '15m'
    ORDER BY timestamp DESC
    LIMIT 15
  `).all(tokenAddress).reverse();

  const candles1h = db.prepare(`
    SELECT open, high, low, close, volume
    FROM tokenCandles
    WHERE tokenAddress = ?
      AND timeframe = '1h'
    ORDER BY timestamp DESC
    LIMIT 15
  `).all(tokenAddress).reverse();

  const snapshots = db.prepare(`
    SELECT *
    FROM tokenSnapshots
    WHERE tokenAddress = ?
    ORDER BY timestamp DESC
    LIMIT 2
  `).all(tokenAddress);

  const current = snapshots[0] || null;
  const prev = snapshots.length > 1 ? snapshots[1] : null;

  const tokenMeta = db.prepare(`
    SELECT
      name,
      symbol,
      createdAt,
      lastMarketCap,
      lastVolume,
      lastLiquidity,
      lastHolders
    FROM tokensData
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  if (!tokenMeta || !current) {
    return null;
  }

  const ageDays = tokenMeta.createdAt
    ? Math.floor((Date.now() - tokenMeta.createdAt) / 86400000)
    : null;

  const deltas = prev ? buildDeltas(current, prev) : null;

  return {
    token: {
      address: tokenAddress,
      name: tokenMeta.name,
      symbol: tokenMeta.symbol
    },
    token_meta: {
      age_days: ageDays
    },
    market_snapshot: {
      price: current.price ?? null,
      market_cap: tokenMeta.lastMarketCap ?? null,
      volume_24h: tokenMeta.lastVolume ?? null,
      liquidity: tokenMeta.lastLiquidity ?? null,
      holders: tokenMeta.lastHolders ?? null
    },
    deltas,
    holders_analysis: analyzeHolders(
      tokenMeta.lastHolders,
      prev?.holders ?? null
    ),

    price_structure: {
      trend_15m: analyzeTrend(candles15m),
      trend_1h: analyzeTrend(candles1h),
      volatility: analyzeVolatility(candles15m)
    },

    derived_signals: {
      volume_spike: deltas ? deltas.volume_5m > 100 : false,
      liquidity_drop: deltas ? deltas.liquidity_5m < -5 : false
    },

    candles: {
      "15m": candles15m,
      "1h": candles1h
    }
  };
}

module.exports = {
  buildTokenRawAISnapshot
};