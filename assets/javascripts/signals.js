import { renderSignalsTable } from "./signalsTableRenderer.js";

let refreshInterval = null;

let currentRange = "all";
let cachedSignals = [];

async function loadSignals() {
  const signals = await window.oraclePnl.getTokenSignals();
  cachedSignals = signals;

  renderSignalsTable({
    tableSelector: "#signalsTable",
    signals
  });
  renderLivePnL(signals);
  updateEquityChart();
  renderSignalsKPI(calculateSignalsKPI(signals));
}

export function onMount() {
  loadSignals();

  refreshInterval = setInterval(loadSignals, 5000);

  return () => {
    clearInterval(refreshInterval);
    refreshInterval = null;
  };
}

function calculateLivePnL(signals) {
  let pnlSum = 0;
  let capitalSum = 0;

  for (const s of signals) {
    if (s.status !== 1) continue;

    const start = Number(s.startMarketCap);
    const last  = Number(s.lastMarketCap);

    if (!start || !last) continue;

    pnlSum += (last - start);
    capitalSum += start;
  }

  if (capitalSum === 0) return 0;

  return (pnlSum / capitalSum) * 100;
}


function renderLivePnL(signals) {
  const el = document.getElementById("kpiLivePnl");
  if (!el) return;

  const livePnl = calculateLivePnL(signals);

  const cls =
    livePnl > 0 ? "pnl-pos" :
    livePnl < 0 ? "pnl-neg" :
    "";

  el.className = cls;
  el.textContent = `${livePnl.toFixed(1)}%`;
}

function formatCompactUSD(value) {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(0)}`;
}

function renderSignalsKPI(kpi) {
  const successEl = document.getElementById("kpiSuccess");
  const totalEl = document.getElementById("kpiTotalSignals");
  const pnlEl = document.getElementById("kpiNetPnl");
  const volEl = document.getElementById("kpiTotalVolume");

  if (!successEl || !totalEl || !pnlEl || !volEl) return;

  successEl.textContent = `${kpi.successRate}%`;
  totalEl.textContent = kpi.total;
  pnlEl.textContent = `${kpi.netPnl.toFixed(2)}%`;
  volEl.textContent = formatCompactUSD(kpi.volume);

  pnlEl.className =
    "fw-bold fs-5 " +
    (kpi.netPnl >= 0 ? "text-success" : "text-danger");
}

function calculateSignalRealizedPnL(signal) {
  const startMC = Number(signal.startMarketCap);
  const lastMC  = Number(signal.lastMarketCap);

  if (!Number.isFinite(startMC) || startMC <= 0) return null;
  if (signal.tpStage >= 3) return 250;
  if (signal.tpStage >= 2) return 100;
  if (signal.tpStage >= 1) return 35;
  if (
    signal.status === 4 &&
    Number.isFinite(lastMC)
  ) {
    return ((lastMC - startMC) / startMC) * 100;
  }
  return 0;
}

function calculateSignalsKPI(signals) {
  let total = 0;
  let wins = 0;
  let losses = 0;
  let netPnl = 0;
  let exposure = 0;

  for (const s of signals) {
    const pnl = calculateSignalRealizedPnL(s);
    if (pnl === null) continue;

    total++;
    netPnl += pnl;
    exposure += s.startMarketCap || 0;

    if (s.tpStage >= 1) {
      wins++;
      continue;
    }

    if (s.status === 4) {
      losses++;
      continue;
    }

  }

  const decisive = wins + losses;

  const successRate =
    decisive === 0
      ? 0
      : Math.round((wins / decisive) * 100);

  return {
    total,
    wins,
    losses,
    successRate,
    netPnl,
    volume: exposure
  };
}

function updateEquityChart() {
  const filtered = filterSignalsByRange(cachedSignals, currentRange);
  const curve = buildEquityCurve(filtered);
  const canvas = document.getElementById("signalsEquityChart");
  drawEquityChart(canvas, curve);
}


function filterSignalsByRange(signals, range) {
  const now = Date.now();

  let from = 0;

  if (range === "day") {
    from = now - 24 * 60 * 60 * 1000;
  } else if (range === "week") {
    from = now - 7 * 24 * 60 * 60 * 1000;
  } else if (range === "month") {
    from = now - 30 * 24 * 60 * 60 * 1000;
  }

  return signals.filter(s => s.createdAt >= from);
}

function calculateRealizedPnL(signal) {
  if (!signal.startMarketCap) return null;

  let realized = 0;
  let remainingWeight = 1;

  if (signal.tpStage >= 1) {
    realized += 0.30 * 35;
    remainingWeight -= 0.30;
  }

  if (signal.tpStage >= 2) {
    realized += 0.30 * 100;
    remainingWeight -= 0.30;
  }

  if (signal.tpStage >= 3) {
    realized += 0.40 * 250;
    remainingWeight = 0;
    return realized;
  }

  if (signal.status === 4 && signal.lastMarketCap) {
    const stopPnl =
      ((signal.lastMarketCap - signal.startMarketCap) /
        signal.startMarketCap) * 100;

    realized += remainingWeight * stopPnl;
  }

  if (
    signal.status === 3 &&
    signal.tpStage === 0 &&
    signal.lastMarketCap
  ) {
    realized =
      ((signal.lastMarketCap - signal.startMarketCap) /
        signal.startMarketCap) * 100;
  }

  return realized;
}

function buildEquityCurve(signals) {
  let cumulative = 0;

  return signals
    .filter(s =>
      s.startMarketCap &&
      (
        s.tpStage > 0 ||
        s.status === 3 ||
        s.status === 4
      )
    )
    .sort((a, b) =>
      (a.updatedAt || a.createdAt) -
      (b.updatedAt || b.createdAt)
    )
    .map(s => {
      const pnl = calculateRealizedPnL(s);
      if (pnl === null) return null;

      cumulative += pnl;

      return {
        x: s.updatedAt || s.createdAt,
        y: cumulative
      };
    })
    .filter(Boolean);
}


function drawEquityChart(canvas, points) {
  if (!canvas || points.length < 2) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const minY = Math.min(...points.map(p => p.y), 0);
  const maxY = Math.max(...points.map(p => p.y));

  const mapX = x =>
    ((x - minX) / (maxX - minX || 1)) * (w - 40) + 20;

  const mapY = y =>
    h - (((y - minY) / (maxY - minY || 1)) * (h - 40) + 20);

  ctx.strokeStyle = "#ddd";
  ctx.beginPath();
  ctx.moveTo(0, mapY(0));
  ctx.lineTo(w, mapY(0));
  ctx.stroke();

  ctx.beginPath();
  points.forEach((p, i) => {
    const x = mapX(p.x);
    const y = mapY(p.y);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#ffb400";
  ctx.lineWidth = 0.6;
  ctx.stroke();
}