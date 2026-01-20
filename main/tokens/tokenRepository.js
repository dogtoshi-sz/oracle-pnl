const { getDb } = require("../database");
const { getSetting } = require("../state/settings");
const db = getDb();

function getTokensNeedingUpdate(intervalMs) {
  const threshold = Date.now() - intervalMs;

  return db.prepare(`
    SELECT tokenAddress
    FROM tokensData
    WHERE status = 'active'
      AND (updatedAt IS NULL OR updatedAt < ?)
    ORDER BY updatedAt ASC
  `).all(threshold);
}

const upsertStmt = db.prepare(`
  INSERT INTO tokensData (
    tokenAddress,
    name,
    symbol,
    source,
    tier,
    status,
    createdAt,
    updatedAt
  ) VALUES (
    @tokenAddress,
    @name,
    @symbol,
    @source,
    @tier,
    @status,
    @createdAt,
    @updatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    name = COALESCE(tokensData.name, excluded.name),
    source = CASE
      WHEN tokensData.source IS NULL
      THEN excluded.source
      ELSE tokensData.source
    END,
    updatedAt = excluded.updatedAt
`);

const upsertTokenTx = db.transaction((token) => {
  upsertStmt.run(token);
});

function upsertToken(token) {
  upsertTokenTx({
    tokenAddress: token.tokenAddress,
    name: token.name ?? null,
    symbol: token.symbol ?? null,
    source: token.source,
    tier: token.tier,
    status: "active",
    createdAt: Date.now(),
    updatedAt: null
  });
}

const updateMarketStmt = db.prepare(`
  UPDATE tokensData SET
    name = CASE
      WHEN name IS NULL AND @name IS NOT NULL THEN @name
      ELSE name
    END,

    symbol = CASE
      WHEN symbol IS NULL AND @symbol IS NOT NULL THEN @symbol
      ELSE symbol
    END,

    source = CASE
      WHEN source IS NULL AND @source IS NOT NULL THEN @source
      ELSE source
    END,

    lastPrice = @lastPrice,
    lastMarketCap = @lastMarketCap,
    lastVolume = @lastVolume,
    lastLiquidity = @lastLiquidity,
    lastHolders = COALESCE(@lastHolders, lastHolders),
    updatedAt = @updatedAt

  WHERE tokenAddress = @tokenAddress;
`);

const updateMarketTx = db.transaction((payload) => {
  updateMarketStmt.run(payload);

  const signal = db.prepare(`
    SELECT
      id,
      startMarketCap,
      peakMarketCap,
      tpStage,
      openedAt
    FROM tokenSignals
    WHERE tokenAddress = ?
      AND status = 1
    LIMIT 1
  `).get(payload.tokenAddress);

  if (!signal || !signal.startMarketCap) return;

  const now = Date.now();

  const pnl = (payload.lastMarketCap - signal.startMarketCap) / signal.startMarketCap;

  const STOP_LOSS = getSetting("signal.stopLossPct", -0.25);
  const TP1 = getSetting("signal.tp1Pct", 0.35);
  const TP2 = getSetting("signal.tp2Pct", 1.0);
  const TP3 = getSetting("signal.tp3Pct", 2.5);
  const MAX_HOLD_MS = getSetting("signal.maxHoldMinutes", 90) * 60 * 1000;
  const NO_NEW_HIGH_MS = getSetting("signal.noNewHighMinutes", 45) * 60 * 1000;
  const NO_NEW_HIGH_DROP = getSetting("signal.noNewHighDropRatio", 0.9);

  const peakMarketCap = Math.max(
    signal.peakMarketCap || signal.startMarketCap,
    payload.lastMarketCap
  );

  db.prepare(`
    UPDATE tokenSignals
    SET peakMarketCap = ?
    WHERE id = ?
  `).run(peakMarketCap, signal.id);

  if (pnl <= STOP_LOSS) {
    db.prepare(`
      UPDATE tokenSignals
      SET status = 4, updatedAt = ?
      WHERE id = ?
    `).run(now, signal.id);
    return;
  }

  if (
    signal.openedAt &&
    now - signal.openedAt >= MAX_HOLD_MS
  ) {
    db.prepare(`
      UPDATE tokenSignals
      SET status = 3, updatedAt = ?
      WHERE id = ?
    `).run(now, signal.id);
    return;
  }

  if (
    signal.openedAt &&
    now - signal.openedAt >= NO_NEW_HIGH_MS &&
    payload.lastMarketCap < peakMarketCap * NO_NEW_HIGH_DROP
  ) {
    db.prepare(`
      UPDATE tokenSignals
      SET status = 3, updatedAt = ?
      WHERE id = ?
    `).run(now, signal.id);
    return;
  }

  if (pnl >= TP3 && signal.tpStage < 3) {
    db.prepare(`
      UPDATE tokenSignals
      SET tpStage = 3, updatedAt = ?
      WHERE id = ?
    `).run(now, signal.id);
    return;
  }

  if (pnl >= TP2 && signal.tpStage < 2) {
    db.prepare(`
      UPDATE tokenSignals
      SET tpStage = 2, updatedAt = ?
      WHERE id = ?
    `).run(now, signal.id);
    return;
  }

  if (pnl >= TP1 && signal.tpStage < 1) {
    db.prepare(`
      UPDATE tokenSignals
      SET tpStage = 1, updatedAt = ?
      WHERE id = ?
    `).run(now, signal.id);
    return;
  }

  db.prepare(`
    UPDATE tokenSignals
    SET lastMarketCap = ?, updatedAt = ?
    WHERE id = ?
  `).run(payload.lastMarketCap, now, signal.id);
});

function updateTokenMarketData(tokenAddress, data) {
  updateMarketTx({
    tokenAddress,
    name: data.name ?? null,
    symbol: data.symbol ?? null,
    source: data.dexId ?? null,
    lastPrice: data.price,
    lastMarketCap: data.marketCap,
    lastVolume: data.volume,
    lastLiquidity: data.liquidity,
    lastHolders: data.holders ?? null,
    updatedAt: Date.now(),
  });
}

function getAllActiveTokens() {
  return db
    .prepare(`SELECT * FROM tokensData WHERE status = 'active'`)
    .all();
}

const markTokenDeadStmt = db.prepare(`
  UPDATE tokensData
  SET status = 'dead', updatedAt = ?
  WHERE tokenAddress = ?
`);

function markTokenDead(tokenAddress) {
  markTokenDeadStmt.run(Date.now(), tokenAddress);
}

function getActiveTokensForTable() {
  const db = getDb();

  return db.prepare(`
    SELECT
      t.tokenAddress,
      t.name,
      t.symbol,
      t.lastMarketCap,
      t.lastVolume,
      t.lastLiquidity,
      t.lastHolders,
      t.createdAt,

      (
        SELECT d.decision
        FROM tokenAIDecisions d
        WHERE d.tokenAddress = t.tokenAddress
          AND d.aiModel = 'gpt-4o-mini'
        ORDER BY d.createdAt DESC
        LIMIT 1
      ) AS aiDecision,

      (
        SELECT d.decision
        FROM tokenAIDecisions d
        WHERE d.tokenAddress = t.tokenAddress
          AND d.aiModel LIKE 'gemini%'
        ORDER BY d.createdAt DESC
        LIMIT 1
      ) AS geminiDecision

    FROM tokensData t
    WHERE t.status = 'active'
    ORDER BY t.lastMarketCap DESC
  `).all();
}

function getTopMarketCapTokens(limit = 12) {
  const db = getDb();

  return db.prepare(`
    SELECT
      t.tokenAddress,
      t.name,
      t.symbol,
      t.lastMarketCap,
      t.lastVolume,
      t.createdAt,

      (
        SELECT d.decision
        FROM tokenAIDecisions d
        WHERE d.tokenAddress = t.tokenAddress
          AND d.aiModel = 'gpt-4o-mini'
        ORDER BY d.createdAt DESC
        LIMIT 1
      ) AS aiDecision,

      (
        SELECT d.decision
        FROM tokenAIDecisions d
        WHERE d.tokenAddress = t.tokenAddress
          AND d.aiModel LIKE 'gemini%'
        ORDER BY d.createdAt DESC
        LIMIT 1
      ) AS geminiDecision

    FROM tokensData t
    WHERE t.status = 'active'
      AND t.lastMarketCap IS NOT NULL
    ORDER BY t.lastMarketCap DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  upsertToken,
  updateTokenMarketData,
  getAllActiveTokens,
  getTokensNeedingUpdate,
  markTokenDead,
  getActiveTokensForTable,
  getTopMarketCapTokens,
};