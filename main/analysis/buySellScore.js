function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function calculateBuySellScore({
  trend4h,
  trendStrength4h,
  support1h,
  resistance1h,
  distanceToSupportPct,
  distanceToResistancePct,
  momentum1h
}) {
  let buyScore = 0;

  if (trend4h === "down") {
    buyScore -= 30;
  } else if (trend4h === "up") {
    buyScore += 20 * trendStrength4h;
  }

  if (support1h) {
    buyScore += support1h.strength * 30;
  }

  if (distanceToSupportPct !== null) {
    const proximityScore =
      clamp(1 - distanceToSupportPct / 10) * 20;
    buyScore += proximityScore;
  }

  buyScore += clamp(momentum1h, -1, 1) * 10;
  buyScore = clamp(buyScore / 100, 0, 1) * 100;

  let sellScore = 0;

  if (trend4h === "up") {
    sellScore -= 30;
  } else if (trend4h === "down") {
    sellScore += 20 * trendStrength4h;
  }

  if (resistance1h) {
    sellScore += resistance1h.strength * 30;
  }

  if (distanceToResistancePct !== null) {
    const proximityScore =
      clamp(1 - distanceToResistancePct / 10) * 20;
    sellScore += proximityScore;
  }

  sellScore += clamp(-momentum1h, -1, 1) * 10;
  sellScore = clamp(sellScore / 100, 0, 1) * 100;

  let decision = "NO_TRADE";
  let confidence = 0;

  if (buyScore > 60 && buyScore > sellScore + 10) {
    decision = "BUY";
    confidence = buyScore / 100;
  } else if (sellScore > 60 && sellScore > buyScore + 10) {
    decision = "SELL";
    confidence = sellScore / 100;
  }

  return {
    buyScore: Number(buyScore.toFixed(1)),
    sellScore: Number(sellScore.toFixed(1)),
    decision,
    confidence: Number(confidence.toFixed(2))
  };
}

module.exports = {
  calculateBuySellScore
};