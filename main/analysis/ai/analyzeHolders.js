function analyzeHolders(current, prev) {
  if (!current) return null;

  let trend = "FLAT";
  if (prev) {
    if (current > prev * 1.05) trend = "INCREASING";
    else if (current < prev * 0.95) trend = "DECREASING";
  }

  let tier;
  if (current < 50) tier = "VERY_LOW";
  else if (current < 150) tier = "LOW";
  else if (current < 500) tier = "MEDIUM";
  else tier = "HIGH";

  return {
    approx_holders: current,
    holder_tier: tier,
    trend
  };
}

module.exports = { analyzeHolders };