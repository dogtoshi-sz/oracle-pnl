function percentChange(current, prev) {
  if (!prev || prev === 0) return null;
  return Number((((current - prev) / prev) * 100).toFixed(2));
}

function buildDeltas(current, prev) {
  if (!current || !prev) return null;

  return {
    price_5m: percentChange(current.price, prev.price),
    marketcap_5m: percentChange(current.marketCap, prev.marketCap),
    volume_5m: percentChange(current.volume, prev.volume),
    liquidity_5m: percentChange(current.liquidity, prev.liquidity),
    holders_5m: percentChange(current.holders, prev.holders),
  };
}

module.exports = { buildDeltas };