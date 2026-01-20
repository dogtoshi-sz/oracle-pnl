function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function calculate15mTiming(candles) {
  if (candles.length < 5) {
    return {
      entryQuality: 0,
      timingSignal: "wait"
    };
  }

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const momentum =
    (last.close - prev.close) / prev.close;

  const ranges = candles.slice(-5).map(c => c.high - c.low);
  const avgRange =
    ranges.reduce((a, b) => a + b, 0) / ranges.length;

  const volatility =
    avgRange / last.close;

  let entryQuality = 0;

  if (momentum > 0) entryQuality += 0.4;
  if (volatility < 0.02) entryQuality += 0.3;
  if (volatility < 0.01) entryQuality += 0.3;

  entryQuality = clamp(entryQuality);

  let timingSignal = "wait";
  if (entryQuality > 0.7) timingSignal = "good";
  else if (entryQuality < 0.3) timingSignal = "risky";

  return {
    entryQuality: Number(entryQuality.toFixed(2)),
    momentum15m: Number(momentum.toFixed(4)),
    volatility: Number(volatility.toFixed(4)),
    timingSignal
  };
}

module.exports = {
  calculate15mTiming
};
