function calculateVolumeAnomaly(candles, lookback = 20) {
  if (!candles || candles.length < lookback + 1) {
    return {
      volumeRatio: 0,
      anomaly: 0
    };
  }

  const recent = candles[candles.length - 1];
  const history = candles.slice(-lookback - 1, -1);

  const avgVolume =
    history.reduce((sum, c) => sum + c.volume, 0) / history.length;

  if (!avgVolume || avgVolume === 0) {
    return {
      volumeRatio: 0,
      anomaly: 0
    };
  }

  const volumeRatio = recent.volume / avgVolume;

  return {
    volumeRatio: Number(volumeRatio.toFixed(2)),
    anomaly: volumeRatio >= 2 ? 1 : 0
  };
}

module.exports = {
  calculateVolumeAnomaly
};