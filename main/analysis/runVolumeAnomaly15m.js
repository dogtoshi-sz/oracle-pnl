const { getDb } = require("../database");
const db = getDb();
const { calculateVolumeAnomaly } = require("./volumeAnomaly");

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress
  FROM tokensData
  WHERE status = 'active'
`);

const getCandlesStmt = db.prepare(`
  SELECT volume
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = '15m'
  ORDER BY timestamp ASC
  LIMIT 25
`);

const upsertStmt = db.prepare(`
  INSERT INTO tokenVolumeAnomaly (
    tokenAddress,
    volumeRatio,
    anomaly,
    calculatedAt
  ) VALUES (
    @tokenAddress,
    @volumeRatio,
    @anomaly,
    @calculatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    volumeRatio = excluded.volumeRatio,
    anomaly = excluded.anomaly,
    calculatedAt = excluded.calculatedAt
`);

function runVolumeAnomaly15m() {
  const tokens = getActiveTokensStmt.all();

  for (const { tokenAddress } of tokens) {
    const candles = getCandlesStmt.all(tokenAddress);
    if (candles.length < 10) continue;

    const result = calculateVolumeAnomaly(candles);

    upsertStmt.run({
      tokenAddress,
      ...result,
      calculatedAt: Date.now()
    });
  }

  console.log("[VOLUME ANOMALY] updated");
}

module.exports = {
  runVolumeAnomaly15m
};