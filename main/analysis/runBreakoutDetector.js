const { getDb } = require("../database");
const db = getDb();
const { detectBreakout } = require("./breakoutDetector");

const tokensStmt = db.prepare(`
  SELECT tokenAddress FROM tokensData WHERE status='active'
`);

const candlesStmt = db.prepare(`
  SELECT close
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = '1h'
  ORDER BY timestamp ASC
  LIMIT 50
`);

const srStmt = db.prepare(`
  SELECT resistance_json
  FROM tokenSupportResistance
  WHERE tokenAddress = ?
    AND timeframe = '1h'
`);

const volumeStmt = db.prepare(`
  SELECT volumeRatio
  FROM tokenVolumeAnomaly
  WHERE tokenAddress = ?
`);

const timingStmt = db.prepare(`
  SELECT volatility
  FROM tokenTiming15m
  WHERE tokenAddress = ?
`);

const upsertStmt = db.prepare(`
  INSERT INTO tokenBreakoutState (
    tokenAddress,
    state,
    score,
    resistance,
    calculatedAt
  ) VALUES (
    @tokenAddress,
    @state,
    @score,
    @resistance,
    @calculatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    state = excluded.state,
    score = excluded.score,
    resistance = excluded.resistance,
    calculatedAt = excluded.calculatedAt
`);

function runBreakoutDetector() {
  const tokens = tokensStmt.all();

  for (const { tokenAddress } of tokens) {
    const candles = candlesStmt.all(tokenAddress);
    if (candles.length < 5) continue;

    const sr = srStmt.get(tokenAddress);
    if (!sr) continue;

    const resistances = JSON.parse(sr.resistance_json || "[]");
    const nearestResistance = resistances.at(0)?.price;
    if (!nearestResistance) continue;

    const volumeRatio = volumeStmt.get(tokenAddress)?.volumeRatio ?? 0;
    const volatility15m = timingStmt.get(tokenAddress)?.volatility ?? 999;

    const closes = candles.map(c => c.close);

    const result = detectBreakout({
      closes,
      resistance: nearestResistance,
      volumeRatio,
      volatility15m
    });

    upsertStmt.run({
      tokenAddress,
      state: result.state,
      score: result.score,
      resistance: nearestResistance,
      calculatedAt: Date.now()
    });
  }

  console.log("[BREAKOUT] states updated");
}

module.exports = {
  runBreakoutDetector
};