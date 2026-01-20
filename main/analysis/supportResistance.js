function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function findSwingPoints(candles) {
  const supports = [];
  const resistances = [];

  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];

    if (curr.low < prev.low && curr.low < next.low) {
      supports.push({
        price: curr.low,
        timestamp: curr.timestamp,
        volume: curr.volume
      });
    }

    if (curr.high > prev.high && curr.high > next.high) {
      resistances.push({
        price: curr.high,
        timestamp: curr.timestamp,
        volume: curr.volume
      });
    }
  }

  return { supports, resistances };
}

function binLevels(levels, binPct = 0.002) {
  const bins = [];

  for (const lvl of levels) {
    let placed = false;

    for (const bin of bins) {
      const diffPct = Math.abs(bin.price - lvl.price) / bin.price;
      if (diffPct <= binPct) {
        bin.touches.push(lvl);
        placed = true;
        break;
      }
    }

    if (!placed) {
      bins.push({
        price: lvl.price,
        touches: [lvl]
      });
    }
  }

  return bins;
}

function calculateStrength(bin, candles) {
  const touchCount = bin.touches.length;
  const touchScore = clamp(touchCount / 5);

  let maxReaction = 0;

  for (const t of bin.touches) {
    const idx = candles.findIndex(c => c.timestamp === t.timestamp);
    if (idx === -1 || idx === candles.length - 1) continue;

    const next = candles[idx + 1];
    const reaction =
      Math.abs(next.high - bin.price) / bin.price;

    maxReaction = Math.max(maxReaction, reaction);
  }

  const reactionScore = clamp(maxReaction / 0.05);

  const avgVolume =
    candles.reduce((s, c) => s + c.volume, 0) / candles.length;

  const avgTouchVolume =
    bin.touches.reduce((s, t) => s + t.volume, 0) / touchCount;

  const volumeScore = clamp((avgTouchVolume / avgVolume) / 2);

  const firstTouchTime = Math.min(...bin.touches.map(t => t.timestamp));
  const ageHours = (Date.now() - firstTouchTime) / 3600000;
  const timeScore = clamp(1 - ageHours / 72);

  const strength =
    0.35 * touchScore +
    0.30 * reactionScore +
    0.20 * volumeScore +
    0.15 * timeScore;

  return {
    price: Number(bin.price),
    strength: Number(strength.toFixed(3)),
    touches: touchCount,
    firstTouch: firstTouchTime
  };
}

function calculateSupportResistance(candles, options = {}) {
  const {
    binPct = 0.002,
    minStrength = 0.4,
    maxLevels = 3
  } = options;

  if (!Array.isArray(candles) || candles.length < 10) {
    return {
      supports: [],
      resistances: []
    };
  }

  const { supports, resistances } = findSwingPoints(candles);

  const supportBins = binLevels(supports, binPct);
  const resistanceBins = binLevels(resistances, binPct);

  const supportLevels = supportBins
    .map(b => calculateStrength(b, candles))
    .filter(l => l.strength >= minStrength)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxLevels);

  const resistanceLevels = resistanceBins
    .map(b => calculateStrength(b, candles))
    .filter(l => l.strength >= minStrength)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxLevels);

  return {
    supports: supportLevels,
    resistances: resistanceLevels
  };
}

module.exports = {
  calculateSupportResistance
};