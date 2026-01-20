const { getDb } = require("../database");
const db = getDb();

const deleteSnapshotsStmt = db.prepare(`
  DELETE FROM tokenSnapshots
  WHERE tokenAddress = ?
`);

function deleteTokenSnapshots(tokenAddress) {
  deleteSnapshotsStmt.run(tokenAddress);
}

const insertSnapshotStmt = db.prepare(`
  INSERT INTO tokenSnapshots (
    tokenAddress,
    price,
    marketCap,
    volume,
    liquidity,
    dexId,
    timestamp,
    holders
  ) VALUES (
    @tokenAddress,
    @price,
    @marketCap,
    @volume,
    @liquidity,
    @dexId,
    @timestamp,
    @holders
  )
`);

const insertSnapshotTx = db.transaction((snapshot) => {
  insertSnapshotStmt.run(snapshot);
});

function saveTokenSnapshot(snapshot) {
  insertSnapshotTx(snapshot);
}

module.exports = {
  saveTokenSnapshot,
  deleteTokenSnapshots,
};