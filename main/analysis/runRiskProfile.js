const { getDb } = require("../database");
const db = getDb();
const { calculateRiskProfile } = require("./riskProfile");

const getActiveTokensStmt = db.prepare(`
  SELECT tokenAddress FROM tokensData WHERE status = 'active'
`);

const getPumpStmt = db.prepare(`
  SELECT pumpScore FROM tokenPumpScore WHERE tokenAddress = ?
`);

const getTimingStmt = db.prepare(`
  SELECT timingSignal, volatility
  FROM tokenTiming15m
  WHERE tokenAddress = ?
`);

const getTrendStmt = db.prepare(`
  SELECT trend FROM tokenTrendBias
  WHERE tokenAddress = ?
    AND timeframe = '4h'
`);

const getScoreStmt = db.prepare(`
  SELECT buyScore FROM tokenBuySellScore
  WHERE tokenAddress = ?
`);

const upsertStmt = db.prepare(`
  INSERT INTO tokenRiskProfile (
    tokenAddress,
    riskLevel,
    expectedMove,
    failureRisk,
    setupQuality,
    calculatedAt
  ) VALUES (
    @tokenAddress,
    @riskLevel,
    @expectedMove,
    @failureRisk,
    @setupQuality,
    @calculatedAt
  )
  ON CONFLICT(tokenAddress) DO UPDATE SET
    riskLevel = excluded.riskLevel,
    expectedMove = excluded.expectedMove,
    failureRisk = excluded.failureRisk,
    setupQuality = excluded.setupQuality,
    calculatedAt = excluded.calculatedAt
`);

function runRiskProfile() {
  const tokens = getActiveTokensStmt.all();

  for (const { tokenAddress } of tokens) {
    const pump = getPumpStmt.get(tokenAddress);
    const timing = getTimingStmt.get(tokenAddress);
    const trend = getTrendStmt.get(tokenAddress);
    const score = getScoreStmt.get(tokenAddress);

    if (!pump || !timing || !trend || !score) continue;

    const profile = calculateRiskProfile({
      pumpScore: pump.pumpScore,
      timingSignal: timing.timingSignal,
      volatility: timing.volatility * 100,
      trend4h: trend.trend,
      buyScore: score.buyScore
    });

    upsertStmt.run({
      tokenAddress,
      ...profile,
      calculatedAt: Date.now()
    });
  }

  console.log("[RISK PROFILE] updated");
}

module.exports = {
  runRiskProfile
};