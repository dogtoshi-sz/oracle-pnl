const { getDb } = require("../database");
const db = getDb();
const { calculateBuySellScore } = require("./buySellScore");

const TIMEFRAME_1H = "1h";
const TIMEFRAME_4H = "4h";

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress
  FROM tokensData
  WHERE status = 'active'
`);

const get1hCandlesStmt = db.prepare(`
  SELECT close
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = ?
  ORDER BY timestamp DESC
  LIMIT 2
`);

const get1hSRStmt = db.prepare(`
  SELECT support_json, resistance_json
  FROM tokenSupportResistance
  WHERE tokenAddress = ?
    AND timeframe = ?
`);

const get4hTrendStmt = db.prepare(`
  SELECT trend, trend_strength
  FROM tokenTrendBias
  WHERE tokenAddress = ?
    AND timeframe = ?
`);

const upsertScoreStmt = db.prepare(`
  INSERT INTO tokenBuySellScore (
    tokenAddress,
    buyScore,
    sellScore,
    decision,
    confidence,
    calculatedAt
  ) VALUES (
    @tokenAddress,
    @buyScore,
    @sellScore,
    @decision,
    @confidence,
    @calculatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    buyScore = excluded.buyScore,
    sellScore = excluded.sellScore,
    decision = excluded.decision,
    confidence = excluded.confidence,
    calculatedAt = excluded.calculatedAt
`);

function runBuySellScore() {
  const tokens = getActiveTokensStmt.all();

  for (const { tokenAddress } of tokens) {
    try {
      const candles = get1hCandlesStmt.all(
        tokenAddress,
        TIMEFRAME_1H
      );
      if (candles.length < 2) continue;

      const momentum1h =
        (candles[0].close - candles[1].close) /
        candles[1].close;

      const sr = get1hSRStmt.get(tokenAddress, TIMEFRAME_1H);
      if (!sr) continue;

      const supports = JSON.parse(sr.support_json || "[]");
      const resistances = JSON.parse(sr.resistance_json || "[]");

      const trend = get4hTrendStmt.get(
        tokenAddress,
        TIMEFRAME_4H
      );
      if (!trend) continue;

      const result = calculateBuySellScore({
        trend4h: trend.trend,
        trendStrength4h: trend.trend_strength,

        support1h: supports[0] || null,
        resistance1h: resistances[0] || null,

        distanceToSupportPct: supports[0]
          ? ((candles[0].close - supports[0].price) /
             candles[0].close) * 100
          : null,

        distanceToResistancePct: resistances[0]
          ? ((resistances[0].price - candles[0].close) /
             candles[0].close) * 100
          : null,

        momentum1h
      });

      upsertScoreStmt.run({
        tokenAddress,
        ...result,
        calculatedAt: Date.now()
      });

    } catch (err) {
      console.error(
        `[BUY/SELL SCORE ERROR] ${tokenAddress}`,
        err.message
      );
    }
  }

  console.log("[BUY/SELL SCORE] Cycle complete");
}

module.exports = {
  runBuySellScore
};