const { getDb } = require("../database");
const db = getDb();
const { build1hCandlesForToken } = require("./buildCandles1h");

const BATCH_SIZE = 20;
const SLEEP_MS = 100;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress
  FROM tokensData
  WHERE status = 'active'
`);

async function run1hCandleBuilder() {
  const tokens = getActiveTokensStmt.all();

  console.log(`[CANDLES] Active tokens: ${tokens.length}`);

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    for (const { tokenAddress } of batch) {
      try {
        const count = build1hCandlesForToken(tokenAddress);
        if (count > 0) {
          console.log(`[CANDLES] ${tokenAddress} → ${count} candles`);
        }
      } catch (err) {
        console.error(`[CANDLES ERROR] ${tokenAddress}`, err.message);
      }
    }

    await sleep(SLEEP_MS);
  }

  console.log("[CANDLES] Cycle complete");
}

module.exports = {
  run1hCandleBuilder
};