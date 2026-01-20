const { getDb } = require("../database");
const db = getDb();
const { calculatePumpScore, labelPump } = require("./pumpScore");

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress
  FROM tokensData
  WHERE status = 'active'
`);

const getVolumeStmt = db.prepare(`
  SELECT volumeRatio
  FROM tokenVolumeAnomaly
  WHERE tokenAddress = ?
`);

const getSupportStmt = db.prepare(`
  SELECT support_json
  FROM tokenSupportResistance
  WHERE tokenAddress = ?
    AND timeframe = '1h'
`);

const upsertStmt = db.prepare(`
  INSERT INTO tokenPumpScore (
    tokenAddress,
    pumpScore,
    label,
    calculatedAt
  ) VALUES (
    @tokenAddress,
    @pumpScore,
    @label,
    @calculatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    pumpScore = excluded.pumpScore,
    label = excluded.label,
    calculatedAt = excluded.calculatedAt
`);

function runPumpScore() {
  const tokens = getActiveTokensStmt.all();

  for (const { tokenAddress } of tokens) {
    const vol = getVolumeStmt.get(tokenAddress);
    if (!vol) continue;

    const sr = getSupportStmt.get(tokenAddress);
    const supports = sr ? JSON.parse(sr.support_json) : [];

    const pumpScore = calculatePumpScore({
      volumeRatio: vol.volumeRatio,
      durationBars: 4,
      structureStrength: supports.length
    });

    const label = labelPump(pumpScore);

    upsertStmt.run({
      tokenAddress,
      pumpScore,
      label,
      calculatedAt: Date.now()
    });
  }

  console.log("[PUMPSCORE] updated");
}

module.exports = {
  runPumpScore
};