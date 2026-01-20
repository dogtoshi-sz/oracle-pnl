const { fetchDexscreenerBoosts } = require("./dexscreener");
const { fetchPumpfunRunners } = require("./pumpfun");

async function scanAllSources() {
  const results = [];

  const [dexscreener, pumpfun] = await Promise.all([
    fetchDexscreenerBoosts(),
    fetchPumpfunRunners(),
  ]);

  results.push(...dexscreener, ...pumpfun);

  return results;
}

module.exports = {
  scanAllSources,
};