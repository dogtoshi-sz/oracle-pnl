function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function calculateRiskProfile({
  pumpScore,
  timingSignal,
  volatility,
  trend4h,
  buyScore
}) {
  let risk = 50;
  let setup = 0;

  if (volatility > 6) risk += 30;
  else if (volatility > 3) risk += 15;

  if (pumpScore < 0.4) risk += 25;
  else if (pumpScore > 0.7) risk -= 10;

  if (timingSignal === "RISKY") risk += 20;
  if (timingSignal === "GOOD") risk -= 10;

  if (trend4h === "DOWN") risk += 15;

  risk = clamp(risk);

  setup += Math.min(buyScore, 60) * 0.5;
  setup += pumpScore * 30;

  if (timingSignal === "GOOD") setup += 15;
  if (timingSignal === "RISKY") setup -= 15;

  setup = clamp(setup);

  let expectedMove = "0-5%";

  if (pumpScore > 0.85 && risk > 60) expectedMove = "2x-3x";
  else if (pumpScore > 0.7) expectedMove = "30-100%";
  else if (pumpScore > 0.55) expectedMove = "10-30%";
  else if (pumpScore > 0.4) expectedMove = "5-10%";

  let riskLevel = "LOW";
  if (risk >= 80) riskLevel = "EXTREME";
  else if (risk >= 60) riskLevel = "HIGH";
  else if (risk >= 40) riskLevel = "MEDIUM";

  return {
    riskLevel,
    expectedMove,
    failureRisk: risk,
    setupQuality: Math.round(setup)
  };
}

module.exports = {
  calculateRiskProfile
};