const { getDb } = require("../../database");

function handleBuySellSignal({ token, decision, decisionRaw }) {
  const db = getDb();
  const now = Date.now();

  const tokenRow = db.prepare(`
    SELECT name, symbol, lastMarketCap
    FROM tokensData
    WHERE tokenAddress = ?
  `).get(token.tokenAddress);

  if (!tokenRow || !tokenRow.lastMarketCap) return;

  if (decision !== "BUY") return;

  const active = db.prepare(`
    SELECT 1
    FROM tokenSignals
    WHERE tokenAddress = ?
      AND status = 1
  `).get(token.tokenAddress);

  if (active) return;

  db.prepare(`
    INSERT INTO tokenSignals (
      tokenAddress,
      name,
      symbol,
      startMarketCap,
      lastMarketCap,
      status,
      decisionRaw,
      createdAt,
      updatedAt
    )
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    token.tokenAddress,
    tokenRow.name,
    tokenRow.symbol,
    tokenRow.lastMarketCap,
    tokenRow.lastMarketCap,
    decisionRaw,
    now,
    now
  );
}

module.exports = {
  handleBuySellSignal
};