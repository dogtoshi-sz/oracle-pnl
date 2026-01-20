const { getDb } = require("../database");
const db = getDb();
const { calculateTrendBias } = require("./trendBias");

const TIMEFRAME = "4h";
const BATCH_SIZE = 20;
const SLEEP_MS = 150;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress
  FROM tokensData
  WHERE status = 'active'
`);

const getCandlesStmt = db.prepare(`
  SELECT timestamp, close
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = ?
  ORDER BY timestamp ASC
`);

const getSRStmt = db.prepare(`
  SELECT support_json, resistance_json
  FROM tokenSupportResistance
  WHERE tokenAddress = ?
    AND timeframe = ?
`);

const upsertTrendStmt = db.prepare(`
  INSERT INTO tokenTrendBias (
    tokenAddress,
    timeframe,
    trend,
    trend_strength,
    price_position,
    calculatedAt
  ) VALUES (
    @tokenAddress,
    @timeframe,
    @trend,
    @trend_strength,
    @price_position,
    @calculatedAt
  )
  ON CONFLICT(tokenAddress, timeframe) DO UPDATE SET
    trend = excluded.trend,
    trend_strength = excluded.trend_strength,
    price_position = excluded.price_position,
    calculatedAt = excluded.calculatedAt
`);

async function runTrendBias4h() {
  const tokens = getActiveTokensStmt.all();
  console.log(`[4H TREND] Active tokens: ${tokens.length}`);

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    for (const { tokenAddress } of batch) {
      try {
        const candles = getCandlesStmt.all(tokenAddress, TIMEFRAME);
        if (candles.length < 10) continue;

        const sr = getSRStmt.get(tokenAddress, TIMEFRAME);
        if (!sr) continue;

        const supports = JSON.parse(sr.support_json || "[]");
        const resistances = JSON.parse(sr.resistance_json || "[]");

        const bias = calculateTrendBias(
          candles,
          supports,
          resistances
        );

        upsertTrendStmt.run({
          tokenAddress,
          timeframe: TIMEFRAME,
          trend: bias.trend,
          trend_strength: bias.trend_strength,
          price_position: bias.price_position,
          calculatedAt: Date.now()
        });

      } catch (err) {
        console.error(`[4H TREND ERROR] ${tokenAddress}`, err.message);
      }
    }

    await sleep(SLEEP_MS);
  }

  console.log("[4H TREND] Cycle complete");
}

module.exports = {
  runTrendBias4h
};