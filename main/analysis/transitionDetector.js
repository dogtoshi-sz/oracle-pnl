function detectTransition({
  priceAboveSupport,
  volumeRatio,
  pumpScoreDelta,
  momentum15m,
  riskLevel,
  expectedMove,
  failureRisk,
  breakoutState
}) {
  if (breakoutState !== "CONFIRMED" && breakoutState !== "STRONG") {
    return {
      state: "WAIT",
      satisfied: 0,
      conditions: {
        breakout: false
      }
    };
  }

  const conditions = {
    supportHolding: priceAboveSupport === true,
    volumeConfirmed: volumeRatio >= 1.5,
    pumpImproving: pumpScoreDelta >= 0.15,
    momentumShift: momentum15m > 0,
    acceptableRisk:
      riskLevel !== "HIGH" &&
      failureRisk <= 60 &&
      expectedMove !== "0-5%"
  };

  const satisfied = Object.values(conditions).filter(Boolean).length;

  let state = "WAIT";
  if (satisfied >= 4) state = "BUY";
  else if (satisfied === 3) state = "WATCH";

  return {
    state,
    satisfied,
    conditions
  };
}

module.exports = {
  detectTransition
};