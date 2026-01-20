function calculatePumpScore({
  volumeRatio,
  durationBars,
  structureStrength
}) {
  let score = 0;
  if (volumeRatio >= 3) score += 0.4;
  else if (volumeRatio >= 2) score += 0.3;
  else if (volumeRatio >= 1.5) score += 0.15;
  if (durationBars >= 6) score += 0.25;
  else if (durationBars >= 4) score += 0.15;
  else if (durationBars >= 2) score += 0.05;
  if (structureStrength >= 2) score += 0.25;
  else if (structureStrength === 1) score += 0.1;
  return Number(Math.min(score, 1).toFixed(2));
}

function labelPump(score) {
  if (score >= 0.7) return "VALID";
  if (score >= 0.4) return "QUESTIONABLE";
  return "FAKE";
}

module.exports = {
  calculatePumpScore,
  labelPump
};