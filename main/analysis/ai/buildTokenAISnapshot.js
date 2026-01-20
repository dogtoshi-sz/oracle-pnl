const { getDb } = require("../../database");
const db = getDb();

function buildTokenAISnapshot(tokenAddress) {
  const token = db.prepare(`
    SELECT name, symbol, lastMarketCap, createdAt
    FROM tokensData
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  const trend4h = db.prepare(`
    SELECT trend, trend_strength
    FROM tokenTrendBias
    WHERE tokenAddress = ?
      AND timeframe = '4h'
  `).get(tokenAddress);

  const sr1h = db.prepare(`
    SELECT support_json, resistance_json
    FROM tokenSupportResistance
    WHERE tokenAddress = ?
      AND timeframe = '1h'
  `).get(tokenAddress);

  const supports = sr1h ? JSON.parse(sr1h.support_json || "[]").map(s => s.price) : [];
  const resistances = sr1h ? JSON.parse(sr1h.resistance_json || "[]").map(r => r.price) : [];

  const timing15m = db.prepare(`
    SELECT momentum15m, volatility, timingSignal, entryQuality
    FROM tokenTiming15m
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  const pump = db.prepare(`
    SELECT pumpScore, label
    FROM tokenPumpScore
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  const volume = db.prepare(`
    SELECT volumeRatio, anomaly
    FROM tokenVolumeAnomaly
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  const risk = db.prepare(`
    SELECT riskLevel, expectedMove, failureRisk, setupQuality
    FROM tokenRiskProfile
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  const transition = db.prepare(`
    SELECT state, satisfiedConditions, conditions_json
    FROM tokenTransitionState
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  const breakout = db.prepare(`
    SELECT state, score
    FROM tokenBreakoutState
    WHERE tokenAddress = ?
  `).get(tokenAddress);

  return {
    token: {
      address: tokenAddress,
      name: token?.name ?? null,
      symbol: token?.symbol ?? null,
      marketCap: token?.lastMarketCap ?? null,
      createdAt: token?.createdAt ?? null
    },

    trend: trend4h ? {
      timeframe: "4h",
      trend: trend4h.trend,
      strength: trend4h.trend_strength
    } : null,

    supportResistance: {
      timeframe: "1h",
      supports,
      resistances
    },

    momentum: timing15m ? {
      timeframe: "15m",
      momentum: timing15m.momentum15m,
      volatility: timing15m.volatility,
      signal: timing15m.timingSignal,
      entryQuality: timing15m.entryQuality
    } : null,

    pump: pump ? {
      pumpScore: pump.pumpScore,
      label: pump.label
    } : null,

    volume: volume ? {
      volumeRatio: volume.volumeRatio,
      anomaly: volume.anomaly
    } : null,

    risk: risk ? {
      level: risk.riskLevel,
      expectedMove: risk.expectedMove,
      failureRisk: risk.failureRisk,
      setupQuality: risk.setupQuality
    } : null,

    transition: transition ? {
      state: transition.state,
      satisfied: transition.satisfied,
      totalConditions: transition.totalConditions
    } : null,

    breakout: breakout ? {
      state: breakout.state,
      score: breakout.score
    } : null
  };
}

module.exports = {
  buildTokenAISnapshot
};