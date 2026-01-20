const { getDb } = require("../database");
const db = getDb();

const TIMEFRAME = "1h";
const ONE_HOUR_MS = 60 * 60 * 1000;

function getHourBucket(ts) {
  return Math.floor(ts / ONE_HOUR_MS) * ONE_HOUR_MS;
}

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

const insertCandleStmt = db.prepare(`
  INSERT OR REPLACE INTO tokenCandles (
    tokenAddress,
    timeframe,
    timestamp,
    open,
    high,
    low,
    close,
    volume
  ) VALUES (
    @tokenAddress,
    @timeframe,
    @timestamp,
    @open,
    @high,
    @low,
    @close,
    @volume
  )
`);

function build1hCandlesForToken(tokenAddress) {
  const row = getLastCandleStmt.get(tokenAddress, TIMEFRAME);
  const lastCandleTs = row?.lastTs ?? 0;

  const snapshots = getSnapshotsStmt.all(tokenAddress, lastCandleTs);

  if (snapshots.length === 0) return 0;

  const buckets = new Map();

  for (const s of snapshots) {
    const bucketTs = getHourBucket(s.timestamp);

    if (!buckets.has(bucketTs)) {
      buckets.set(bucketTs, {
        open: s.price,
        high: s.price,
        low: s.price,
        close: s.price,
        volume: s.volume
      });
    } else {
      const c = buckets.get(bucketTs);
      c.high = Math.max(c.high, s.price);
      c.low = Math.min(c.low, s.price);
      c.close = s.price;
      c.volume += s.volume;
    }
  }

  let inserted = 0;

  for (const [bucketTs, c] of buckets.entries()) {
    insertCandleStmt.run({
      tokenAddress,
      timeframe: TIMEFRAME,
      timestamp: bucketTs,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    });
    inserted++;
  }

  return inserted;
}

module.exports = {
  build1hCandlesForToken
};
