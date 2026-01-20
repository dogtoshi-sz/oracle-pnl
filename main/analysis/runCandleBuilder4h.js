const { getDb } = require("../database");
const db = getDb();
const { build4hCandlesForToken } = require("./buildCandles4h");

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

async function run4hCandleBuilder() {
  const tokens = getActiveTokensStmt.all();

  console.log(`[4H CANDLES] Active tokens: ${tokens.length}`);

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    for (const { tokenAddress } of batch) {
      try {
        const count = build4hCandlesForToken(tokenAddress);
        if (count > 0) {
          console.log(`[4H CANDLES] ${tokenAddress} → ${count}`);
        }
      } catch (err) {
        console.error(`[4H CANDLES ERROR] ${tokenAddress}`, err.message);
      }
    }

    await sleep(SLEEP_MS);
  }

  console.log("[4H CANDLES] Cycle complete");
}

module.exports = {
  run4hCandleBuilder
};