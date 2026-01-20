function detectBreakout({
  closes,
  volumes,
  resistance,
  volumeRatio,
  volatility15m
}) {
  if (!resistance || closes.length < 2) {
    return { state: "NO", score: 0 };
  }

  const last = closes.at(-1);
  const prev = closes.at(-2);

  let score = 0;

  if (last > resistance) score++;
  if (last > resistance && prev > resistance) score++;
  if (volumeRatio >= 2) score++;
  if (volatility15m <= 8) score++;

  const state =
    score >= 4 ? "STRONG" :
    score >= 3 ? "CONFIRMED" :
    score >= 2 ? "WEAK" :
    "NO";

  return { state, score };
}

module.exports = {
  detectBreakout
};