function calculateTrendBias(candles, supports, resistances) {
  if (candles.length < 10) {
    return {
      trend: "range",
      trend_strength: 0,
      price_position: "unknown"
    };
  }

  const closes = candles.map(c => c.close);

  const first = closes[0];
  const last = closes[closes.length - 1];
  const slope = (last - first) / first;

  let higherHighs = 0;
  let lowerLows = 0;

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) higherHighs++;
    if (closes[i] < closes[i - 1]) lowerLows++;
  }

  const momentumScore = (higherHighs - lowerLows) / closes.length;
  const price = last;
  const strongestSupport = supports[0];
  const strongestResistance = resistances[0];
  let price_position = "mid_range";

  if (strongestSupport && price > strongestSupport.price) {
    price_position = "above_support";
  }

  if (strongestResistance && price < strongestResistance.price) {
    price_position = "below_resistance";
  }

  let trend = "range";

  if (slope > 0.02 && momentumScore > 0.05) {
    trend = "up";
  } else if (slope < -0.02 && momentumScore < -0.05) {
    trend = "down";
  }

  const trend_strength = Math.min(
    Math.abs(slope) * 10 + Math.abs(momentumScore),
    1
  );

  return {
    trend,
    trend_strength: Number(trend_strength.toFixed(3)),
    price_position
  };
}

module.exports = {
  calculateTrendBias
};