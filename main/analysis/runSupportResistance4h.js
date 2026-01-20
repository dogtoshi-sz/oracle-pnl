const { getDb } = require("../database");
const db = getDb();
const { calculateSupportResistance } = require("./supportResistance");

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

const getLastCalculatedStmt = db.prepare(`
  SELECT lastCalculatedAt
  FROM tokenSupportResistance
  WHERE tokenAddress = ?
    AND timeframe = ?
`);

const getNewCandlesStmt = db.prepare(`
  SELECT timestamp
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = ?
    AND timestamp > ?
  ORDER BY timestamp ASC
`);

const getAllCandlesStmt = db.prepare(`
  SELECT timestamp, open, high, low, close, volume
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = ?
  ORDER BY timestamp ASC
`);

const upsertSRStmt = db.prepare(`
  INSERT INTO tokenSupportResistance (
    tokenAddress,
    timeframe,
    support_json,
    resistance_json,
    lastCalculatedAt
  ) VALUES (
    @tokenAddress,
    @timeframe,
    @support_json,
    @resistance_json,
    @lastCalculatedAt
  )
  ON CONFLICT(tokenAddress, timeframe) DO UPDATE SET
    support_json = excluded.support_json,
    resistance_json = excluded.resistance_json,
    lastCalculatedAt = excluded.lastCalculatedAt
`);


async function runSupportResistance4h() {
  const tokens = getActiveTokensStmt.all();
  console.log(`[4H SR] Active tokens: ${tokens.length}`);

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    for (const { tokenAddress } of batch) {
      try {
        const row = getLastCalculatedStmt.get(tokenAddress, TIMEFRAME);
        const lastCalculatedAt = row?.lastCalculatedAt ?? 0;

        const newCandles = getNewCandlesStmt.all(
          tokenAddress,
          TIMEFRAME,
          lastCalculatedAt
        );

        if (newCandles.length === 0) continue;

        const candles = getAllCandlesStmt.all(tokenAddress, TIMEFRAME);
        if (candles.length < 10) continue;

        const levels = calculateSupportResistance(candles);

        upsertSRStmt.run({
          tokenAddress,
          timeframe: TIMEFRAME,
          support_json: JSON.stringify(levels.supports),
          resistance_json: JSON.stringify(levels.resistances),
          lastCalculatedAt:
            candles[candles.length - 1].timestamp
        });

      } catch (err) {
        console.error(`[4H SR ERROR] ${tokenAddress}`, err.message);
      }
    }

    await sleep(SLEEP_MS);
  }

  console.log("[4H SR] Cycle complete");
}

module.exports = {
  runSupportResistance4h
};