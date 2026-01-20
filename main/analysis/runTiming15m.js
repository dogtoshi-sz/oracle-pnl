const { getDb } = require("../database");
const db = getDb();
const { calculate15mTiming } = require("./timing15m");

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress FROM tokensData WHERE status='active'
`);

const getCandlesStmt = db.prepare(`
  SELECT open, high, low, close
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = '15m'
  ORDER BY timestamp ASC
  LIMIT 20
`);

const upsertStmt = db.prepare(`
  INSERT INTO tokenTiming15m (
    tokenAddress,
    entryQuality,
    momentum15m,
    volatility,
    timingSignal,
    calculatedAt
  ) VALUES (
    @tokenAddress, @entryQuality, @momentum15m,
    @volatility, @timingSignal, @calculatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    entryQuality = excluded.entryQuality,
    momentum15m = excluded.momentum15m,
    volatility = excluded.volatility,
    timingSignal = excluded.timingSignal,
    calculatedAt = excluded.calculatedAt
`);

function runTiming15m() {
  const tokens = getActiveTokensStmt.all();

  for (const { tokenAddress } of tokens) {
    const candles = getCandlesStmt.all(tokenAddress);
    if (candles.length < 5) continue;

    const t = calculate15mTiming(candles);

    upsertStmt.run({
      tokenAddress,
      ...t,
      calculatedAt: Date.now()
    });
  }

  console.log("[15M TIMING] updated");
}

module.exports = {
  runTiming15m
};