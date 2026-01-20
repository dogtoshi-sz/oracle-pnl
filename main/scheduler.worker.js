const { workerData, parentPort } = require("worker_threads");
const { initDatabase } = require("./database");
const { loadSettings } = require("./state/settings");

try {
  initDatabase(workerData.dbPath);
  loadSettings();
} catch (err) {
  console.error("[WORKER DB INIT ERROR]", err);
  process.exit(1);
}

const {
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
  runAIScheduler
} = require("./analysisPipeline");

let running = false;
let lastRun = 0;
let lastAIRun = 0;

async function tick() {
  const now = Date.now();
  if (running || now - lastRun < 25_000) return;

  running = true;
  lastRun = now;

  try {
    await runDiscovery();
    await runUpdater();
    await run15mCandleBuilder();
    await run1hCandleBuilder();
    await run4hCandleBuilder();
    await runSupportResistance();
    await runSupportResistance4h();
    await runTrendBias4h();
    await runTiming15m();
    await runBuySellScore();
    await runVolumeAnomaly15m();
    await runPumpScore();
    await runRiskProfile();
    await runBreakoutDetector();
    await runTransitionDetector();
    if (now - lastAIRun > 60_000) {
      await runAIScheduler();
      lastAIRun = now;
    }
    parentPort?.postMessage({ type: "tick:success", ts: Date.now() });
  } catch (err) {
    console.error("[WORKER TICK ERROR]", err);
    parentPort?.postMessage({
      type: "tick:error",
      error: err.message,
      stack: err.stack
    });
  } finally {
    running = false;
  }
}

setInterval(tick, 30_000);
tick();