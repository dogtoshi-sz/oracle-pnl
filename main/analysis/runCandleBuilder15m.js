const { getDb } = require("../database");
const db = getDb();

const TIMEFRAME = "15m";
const BUCKET_MS = 15 * 60 * 1000;

function getBucket(ts) {
  return Math.floor(ts / BUCKET_MS) * BUCKET_MS;
}

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress
  FROM tokensData
  WHERE status = 'active'
`);

const getLastCandleStmt = db.prepare(`
  SELECT MAX(timestamp) AS lastTs
  FROM tokenCandles
  WHERE tokenAddress = ?
    AND timeframe = ?
`);

const getSnapshotsStmt = db.prepare(`
  SELECT price, volume, timestamp
  FROM tokenSnapshots
  WHERE tokenAddress = ?
    AND timestamp > ?
  ORDER BY timestamp ASC
`);

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO tokenCandles (
    tokenAddress, timeframe, timestamp,
    open, high, low, close, volume
  ) VALUES (
    @tokenAddress, @timeframe, @timestamp,
    @open, @high, @low, @close, @volume
  )
`);

function build15mCandlesForToken(tokenAddress) {
  const last = getLastCandleStmt.get(tokenAddress, TIMEFRAME);
  const lastTs = last?.lastTs ?? 0;

  const snaps = getSnapshotsStmt.all(tokenAddress, lastTs);
  if (!snaps.length) return 0;

  const buckets = new Map();

  for (const s of snaps) {
    const b = getBucket(s.timestamp);
    if (!buckets.has(b)) {
      buckets.set(b, {
        open: s.price,
        high: s.price,
        low: s.price,
        close: s.price,
        volume: s.volume
      });
    } else {
      const c = buckets.get(b);
      c.high = Math.max(c.high, s.price);
      c.low = Math.min(c.low, s.price);
      c.close = s.price;
      c.volume += s.volume;
    }
  }

  for (const [ts, c] of buckets) {
    insertStmt.run({
      tokenAddress,
      timeframe: TIMEFRAME,
      timestamp: ts,
      ...c
    });
  }

  return buckets.size;
}

async function run15mCandleBuilder() {
  const tokens = getActiveTokensStmt.all();
  for (const { tokenAddress } of tokens) {
    build15mCandlesForToken(tokenAddress);
  }
}

module.exports = {
  run15mCandleBuilder
};
