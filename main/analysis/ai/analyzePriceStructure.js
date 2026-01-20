function analyzeTrend(candles) {
  if (!candles || candles.length < 10) return "UNKNOWN";

  const first = candles[0].close;
  const last = candles[candles.length - 1].close;

  if (last > first * 1.03) return "UP";
  if (last < first * 0.97) return "DOWN";
  return "RANGE";
}

function analyzeVolatility(candles) {
  if (!candles || candles.length < 10) return "UNKNOWN";

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const range =
    (Math.max(...highs) - Math.min(...lows)) /
    Math.min(...lows);

  if (range > 0.25) return "HIGH";
  if (range > 0.1) return "MEDIUM";
  return "LOW";
}

module.exports = { analyzeTrend, analyzeVolatility };