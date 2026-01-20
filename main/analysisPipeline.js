const { run1hCandleBuilder } = require("./analysis/runCandleBuilder");
const { run4hCandleBuilder } = require("./analysis/runCandleBuilder4h");
const { run15mCandleBuilder } = require("./analysis/runCandleBuilder15m");
const { runSupportResistance } = require("./analysis/runSupportResistance");
const { runSupportResistance4h } = require("./analysis/runSupportResistance4h");
const { runTrendBias4h } = require("./analysis/runTrendBias4h");
const { runTiming15m } = require("./analysis/runTiming15m");
const { runBuySellScore } = require("./analysis/runBuySellScore");
const { runVolumeAnomaly15m } = require("./analysis/runVolumeAnomaly15m");
const { runPumpScore } = require("./analysis/runPumpScore");
const { runRiskProfile } = require("./analysis/runRiskProfile");
const { runTransitionDetector } = require("./analysis/runTransitionDetector");
const { runBreakoutDetector } = require("./analysis/runBreakoutDetector");
const { scanAllSources } = require("./scanners");
const { classifyNewToken } = require("./tokens/tokenClassifier");
const { upsertToken, getTokensNeedingUpdate } = require("./tokens/tokenRepository");
const { updateToken } = require("./updaters/tokenUpdater");
const { runAIScheduler } = require("./analysis/ai/aiScheduler");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runDiscovery() {
  const tokens = await scanAllSources();
  for (const token of tokens) {
    if (token.status === "dead") continue;
    upsertToken(classifyNewToken(token));
  }
}

async function runUpdater() {
  const tokens = getTokensNeedingUpdate(60 * 1000);
  for (const t of tokens) {
    await updateToken(t.tokenAddress);
    await sleep(300);
  }
}

module.exports = {
  runDiscovery,
  runUpdater,
  run15mCandleBuilder,
  run1hCandleBuilder,
  run4hCandleBuilder,
  runSupportResistance,
  runSupportResistance4h,
  runTrendBias4h,
  runTiming15m,
  runBuySellScore,
  runVolumeAnomaly15m,
  runPumpScore,
  runRiskProfile,
  runBreakoutDetector,
  runTransitionDetector,
  runAIScheduler,
};