const { getDb } = require("./database");

function runDatabaseCleanup() {
  const db = getDb();

  try {
    const cleanupTx = db.transaction(() => {

      const deadTokens = db
        .prepare(`SELECT tokenAddress FROM tokensData WHERE status = 'dead'`)
        .all();

      if (deadTokens.length > 0) {
        const relatedTables = [
          "tokenCandles",
          "tokenSnapshots",
          "tokenSupportResistance",
          "tokenTrendBias",
          "tokenTiming15m",
          "tokenVolumeAnomaly",
          "tokenPumpScore",
          "tokenRiskProfile",
          "tokenTransitionState",
          "tokenBreakoutState",
          "tokenBuySellScore",
          "tokenAIDecisions"
        ];

        for (const { tokenAddress } of deadTokens) {
          for (const table of relatedTables) {
            db.prepare(`
              DELETE FROM ${table}
              WHERE tokenAddress = ?
            `).run(tokenAddress);
          }

          db.prepare(`
            DELETE FROM tokensData
            WHERE tokenAddress = ?
          `).run(tokenAddress);
        }
      }

      const aiDecisionTokens = db.prepare(`
        SELECT DISTINCT tokenAddress
        FROM tokenAIDecisions
      `).all();

      for (const { tokenAddress } of aiDecisionTokens) {
        db.prepare(`
          DELETE FROM tokenAIDecisions
          WHERE tokenAddress = ?
            AND rowid NOT IN (
              SELECT rowid
              FROM tokenAIDecisions
              WHERE tokenAddress = ?
              ORDER BY createdAt DESC
              LIMIT 20
            )
        `).run(tokenAddress, tokenAddress);
      }

      const snapshotTokens = db.prepare(`
        SELECT DISTINCT tokenAddress
        FROM tokenSnapshots
      `).all();

      for (const { tokenAddress } of snapshotTokens) {
        db.prepare(`
          DELETE FROM tokenSnapshots
          WHERE tokenAddress = ?
            AND rowid NOT IN (
              SELECT rowid
              FROM tokenSnapshots
              WHERE tokenAddress = ?
              ORDER BY timestamp DESC
              LIMIT 10000
            )
        `).run(tokenAddress, tokenAddress);
      }

      const candleGroups = db.prepare(`
        SELECT DISTINCT tokenAddress, timeframe
        FROM tokenCandles
      `).all();

      for (const { tokenAddress, timeframe } of candleGroups) {
        db.prepare(`
          DELETE FROM tokenCandles
          WHERE tokenAddress = ?
            AND timeframe = ?
            AND rowid NOT IN (
              SELECT rowid
              FROM tokenCandles
              WHERE tokenAddress = ?
                AND timeframe = ?
              ORDER BY timestamp DESC
              LIMIT 500
            )
        `).run(tokenAddress, timeframe, tokenAddress, timeframe);
      }
    });

    cleanupTx();
    console.log("[DB CLEANUP] completed successfully");

  } catch (err) {
    console.error("[DB CLEANUP ERROR]", err);
  }
}

module.exports = {
  runDatabaseCleanup
};