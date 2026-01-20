const { getDb } = require("../database");
const db = getDb();
const { detectTransition } = require("./transitionDetector");

const tokensStmt = db.prepare(`
  SELECT tokenAddress FROM tokensData WHERE status='active'
`);

const dataStmt = db.prepare(`
  SELECT
    v.volumeRatio,
    p.pumpScore,
    r.riskLevel,
    r.expectedMove,
    r.failureRisk,
    t.momentum15m,
    t.entryQuality,
    s.support_json
  FROM tokenVolumeAnomaly v
  JOIN tokenPumpScore p ON p.tokenAddress = v.tokenAddress
  JOIN tokenRiskProfile r ON r.tokenAddress = v.tokenAddress
  JOIN tokenTiming15m t ON t.tokenAddress = v.tokenAddress
  JOIN tokenSupportResistance s ON s.tokenAddress = v.tokenAddress
  WHERE v.tokenAddress = ?
    AND s.timeframe = '1h'
`);

const upsertStmt = db.prepare(`
  INSERT INTO tokenTransitionState (
    tokenAddress,
    state,
    satisfiedConditions,
    conditions_json,
    calculatedAt
  ) VALUES (
    @tokenAddress,
    @state,
    @satisfiedConditions,
    @conditions_json,
    @calculatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    state = excluded.state,
    satisfiedConditions = excluded.satisfiedConditions,
    conditions_json = excluded.conditions_json,
    calculatedAt = excluded.calculatedAt
`);

const breakoutStmt = db.prepare(`
  SELECT state
  FROM tokenBreakoutState
  WHERE tokenAddress = ?
`);

function runTransitionDetector() {
  const tokens = tokensStmt.all();

  for (const { tokenAddress } of tokens) {
    const row = dataStmt.get(tokenAddress);
    if (!row) continue;

    const supports = JSON.parse(row.support_json || "[]");
    const nearestSupport = supports.at(-1)?.price;
    if (!nearestSupport) continue;

    const priceAboveSupport = true;
    const breakout = breakoutStmt.get(tokenAddress)?.state ?? "NO";
    const pumpDelta = 0;

    const result = detectTransition({
        priceAboveSupport,
        volumeRatio: row.volumeRatio,
        pumpScoreDelta: 0,
        momentum15m: row.momentum15m,
        riskLevel: row.riskLevel,
        expectedMove: row.expectedMove,
        failureRisk: row.failureRisk,
        breakoutState: breakout
    });

    upsertStmt.run({
      tokenAddress,
      state: result.state,
      satisfiedConditions: result.satisfied,
      conditions_json: JSON.stringify(result.conditions),
      calculatedAt: Date.now()
    });
  }

  console.log("[TRANSITION] states updated");
}

module.exports = {
  runTransitionDetector
};
