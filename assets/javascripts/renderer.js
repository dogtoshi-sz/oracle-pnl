import { renderSignalsTable } from "./signalsTableRenderer.js";

let signalsInterval = null;

let currentRange = "all";
let cachedSignals = [];

async function loadDashboardSignals() {
  const signals = await window.oraclePnl.getTokenSignals();
  cachedSignals = signals;

  renderSignalsTable({
    tableSelector: "#signalsTableDashboard",
    signals: signals.slice(0, 2000)
  });
  renderLivePnL(signals);
  updateEquityChart();
  renderSignalsKPI(calculateSignalsKPI(signals));
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

export function onMount() {
  loadDashboardSignals();

  signalsInterval = setInterval(loadDashboardSignals, 5000);

  return () => {
    clearInterval(signalsInterval);
    signalsInterval = null;
  };
}

let currentTokenAddress = null;

function formatNumber(value) {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "-";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function formatCompactUSD(value) {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(0)}`;
}

function formatAddress(address) {
  if (!address || address.length < 8) return address ?? "-";
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function formatAIDecision(decision) {
  if (!decision) return `<span class="opacity-50">-</span>`;

  const cls =
    decision === "BUY" ? "badge-buy" :
    decision === "SELL" ? "badge-sell" :
    "badge-watch";

  return `<span class="pnl3-badge ${cls}">${decision}</span>`;
}

function formatHoldersInsight(value) {
  if (!value) return `<span class="opacity-50">-</span>`;

  let label, cls;

  if (value <= 100) {
    label = "Highly Concentrated";
    cls = "holders-high-risk";
  } else if (value <= 200) {
    label = "Concentrated";
    cls = "holders-risk";
  } else if (value <= 400) {
    label = "Moderate";
    cls = "holders-neutral";
  } else {
    label = "Distributed";
    cls = "holders-good";
  }

  return `
    <span
      class="holders-badge ${cls}"
      title="Approx holders: ${value}"
    >
      ${label}
    </span>
  `;
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

function renderTable(tokens) {
  const tbody = document.querySelector("#tokensTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  for (const t of tokens) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="small text-gray">${formatTimeAgo(t.createdAt)}</td>
      <td>${t.name ?? "-"}<br><small class="text-gray">${t.symbol ?? "-"}</small></td>
      <td style="font-size:12px" title="${t.tokenAddress}">
        ${formatAddress(t.tokenAddress)}
      </td>
      <td>${formatCompactUSD(t.lastMarketCap)}</td>
      <td>${formatCompactUSD(t.lastVolume)}</td>
      <td>${formatCompactUSD(t.lastLiquidity)}</td>
      <td>${formatHoldersInsight(t.lastHolders)}</td>
      <td>${formatAIDecision(t.aiDecision)}</td>
      <td>${formatAIDecision(t.geminiDecision)}</td>
    `;

    tr.addEventListener("click", async () => {
      currentTokenAddress = t.tokenAddress;

      const data = await window.oraclePnl.getTokenAnalysis(t.tokenAddress);
      await renderSidebar(t, data);

      document
        .querySelectorAll("#tokensTable tbody tr")
        .forEach(r => r.classList.remove("active"));

      tr.classList.add("active");
    });

    tbody.appendChild(tr);
  }
}

function renderPriceChart(canvas, candles, supports, resistances) {
  if (!canvas || !candles?.length) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const prices = candles.map(c => c.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return;

  const y = p => h - ((p - min) / (max - min)) * h;

  ctx.beginPath();
  prices.forEach((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    i === 0 ? ctx.moveTo(x, y(p)) : ctx.lineTo(x, y(p));
  });
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = "#41e71a";
  supports?.forEach(s => {
    ctx.beginPath();
    ctx.moveTo(0, y(s.price));
    ctx.lineTo(w, y(s.price));
    ctx.stroke();
  });

  ctx.strokeStyle = "#e71a1a";
  resistances?.forEach(r => {
    ctx.beginPath();
    ctx.moveTo(0, y(r.price));
    ctx.lineTo(w, y(r.price));
    ctx.stroke();
  });
}

function renderTrendPanel(data) {
  if (!data?.trend4h || !data?.timing15m) return `
  <div class="pnl3-section mb-1 p-5">
      <p class="mb-0">No data available.</p>
  </div>
  `;

  const trend = data.trend4h.trend;
  const strength = data.trend4h.trend_strength;
  const timing = data.timing15m.timingSignal;
  const entryQuality = data.timing15m.entryQuality;

  const strengthPercent = Math.min(strength, 100);
  const entryPercent = Math.round(entryQuality * 100);

  const trendColor =
    trend === "UP" ? "text-success" :
    trend === "DOWN" ? "text-danger" :
    "text-warning";

  const strengthBarColor =
    strengthPercent >= 70 ? "bg-green" :
    strengthPercent >= 40 ? "bg-yellow" :
    "bg-red";

  const timingBadge =
    timing === "BUY" ? "badge-buy" :
    timing === "WAIT" ? "badge-watch" :
    "badge-sell";

  return `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">Trend & Timing</div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <small class="opacity-75">4H Trend</small><br>
          <strong class="${trendColor}">${trend}</strong>
        </div>

        <div class="text-end">
          <small class="opacity-75">15M Timing</small><br>
          <span class="pnl3-badge ${timingBadge}">
            ${timing}
          </span>
        </div>
      </div>

      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <small>Trend Strength</small>
          <small>${strengthPercent}%</small>
        </div>

        <div class="progress" style="height:18px; background:#1c1c1c;">
          <div
            class="progress-bar ${strengthBarColor}"
            role="progressbar"
            style="width:${strengthPercent}%"
          >
            ${strengthPercent}%
          </div>
        </div>
      </div>

      <div>
        <div class="d-flex justify-content-between mb-1">
          <small>Entry Quality</small>
          <small>${entryPercent}%</small>
        </div>

        <div class="progress" style="height:18px; background:#1c1c1c;">
          <div
            class="progress-bar bg-purple"
            role="progressbar"
            style="width:${entryPercent}%"
          >
            ${entryPercent}%
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderScore(score) {
  if (!score) return `
  <div class="pnl3-section mb-1 p-5">
      <p class="mb-0">No data available.</p>
  </div>
  `;

  const buy = score.buyScore ?? 0;
  const sell = score.sellScore ?? 0;
  const total = buy + sell || 1;

  const buyPercent = Math.round((buy / total) * 100);
  const sellPercent = 100 - buyPercent;

  const decisionClass =
    score.decision === "BUY" ? "badge-buy" :
    score.decision === "SELL" ? "badge-sell" :
    "badge-watch";

  return `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">Market Snapshot</div>

      <div class="d-flex justify-content-between mb-1">
        <small class="text-success">BUY ${buy}</small>
        <small class="text-danger">SELL ${sell}</small>
      </div>

      <div class="progress mb-2" style="height:20px; background:#1c1c1c;">
        <div
          class="progress-bar bg-green"
          style="width:${buyPercent}%"
        >
          ${buyPercent}%
        </div>

        <div
          class="progress-bar bg-red"
          style="width:${sellPercent}%"
        >
          ${sellPercent}%
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-2">
        <div>
          <small class="opacity-75">Decision</small><br>
          <span class="pnl3-badge ${decisionClass}">
            ${score.decision}
          </span>
        </div>

        <div class="text-end">
          <small class="opacity-75">Confidence</small><br>
          <strong>${Math.round(score.confidence * 100)}%</strong>
        </div>
      </div>
    </div>
  `;
}

function renderPumpPanel(data) {
  if (!data?.pump || !data?.volume) return `
  <div class="pnl3-section mb-1 p-5">
      <p class="mb-0">No data available.</p>
  </div>
  `;

  const score = data.pump.pumpScore;
  const scorePercent = Math.round(score * 100);

  const volumeRatio = data.volume.volumeRatio;
  const volumePercent = Math.min((volumeRatio / 3) * 100, 100);

  const label = data.pump.label;

  const scoreBarClass =
    label === "VALID" ? "bg-green" :
    label === "QUESTIONABLE" ? "bg-yellow" :
    "bg-red";

  return `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">Pump & Volume</div>

      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <small>Pump Strength</small>
          <small>${score.toFixed(2)}</small>
        </div>

        <div class="progress" style="height:18px; background:#1c1c1c;">
          <div
            class="progress-bar ${scoreBarClass}"
            role="progressbar"
            style="width:${scorePercent}%"
          >
            ${scorePercent}%
          </div>
        </div>
      </div>

      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <small>Volume Ratio</small>
          <small>${volumeRatio.toFixed(2)}×</small>
        </div>

        <div class="progress" style="height:18px; background:#1c1c1c;">
          <div
            class="progress-bar bg-purple"
            role="progressbar"
            style="width:${volumePercent}%"
          >
            ${volumeRatio.toFixed(2)}×
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-2">
        <div>
          <small class="d-block opacity-75">Label</small>
          <strong class="${
            label === "VALID" ? "text-success" :
            label === "QUESTIONABLE" ? "text-warning" :
            "text-danger"
          }">
            ${label}
          </strong>
        </div>

        <div class="text-end">
          <small class="d-block opacity-75">Anomaly</small>
          <strong class="${data.volume.anomaly ? "text-danger" : "text-success"}">
            ${data.volume.anomaly ? "YES" : "NO"}
          </strong>
        </div>
      </div>
    </div>
  `;
}

function renderRiskPanel(data) {
  if (!data?.risk) return `
  <div class="pnl3-section mb-1 p-5">
      <p class="mb-0">No data available.</p>
  </div>
  `;

  const failure = Math.min(Math.max(data.risk.failureRisk, 0), 100);
  const rewardPercent = Math.min(
    Math.max(
      parseFloat(
        String(data.risk.expectedMove).replace(/[^\d.-]/g, "")
      ) || 0,
      0
    ),
    100
  );

  const riskBadge =
    data.risk.riskLevel === "LOW" ? "badge-buy" :
    data.risk.riskLevel === "HIGH" ? "badge-sell" :
    "badge-watch";

  const setupColor =
    data.risk.setupQuality === "A" ? "text-success" :
    data.risk.setupQuality === "B" ? "text-warning" :
    "text-danger";

  return `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">Risk Profile</div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <small class="opacity-75">Risk Level</small><br>
          <span class="pnl3-badge ${riskBadge}">
            ${data.risk.riskLevel}
          </span>
        </div>

        <div class="text-end">
          <small class="opacity-75">Setup Quality</small><br>
          <strong class="${setupColor}">
            ${data.risk.setupQuality}
          </strong>
        </div>
      </div>

      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <small>Failure Risk</small>
          <small>${failure}%</small>
        </div>

        <div class="progress" style="height:18px; background:#1c1c1c;">
          <div
            class="progress-bar bg-red"
            style="width:${failure}%"
          >
            ${failure}%
          </div>
        </div>
      </div>

      <div>
        <div class="d-flex justify-content-between mb-1">
          <small>Expected Move</small>
          <small>${data.risk.expectedMove}</small>
        </div>

        <div class="progress" style="height:18px; background:#1c1c1c;">
          <div
            class="progress-bar bg-green"
            style="width:${rewardPercent}%"
          >
            ${data.risk.expectedMove}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTransition(data) {
  if (!data?.transition) return `
  <div class="pnl3-section mb-1 p-5">
      <p class="mb-0">No data available.</p>
  </div>
  `;

  const total = data.transition.totalConditions || 5;
  const satisfied = data.transition.satisfiedConditions || 0;
  const percent = Math.round((satisfied / total) * 100);

  const stateBadge =
    data.transition.state === "BUY" ? "badge-buy" :
    data.transition.state === "WATCH" ? "badge-watch" :
    "badge-sell";

  const barColor =
    percent >= 80 ? "bg-green" :
    percent >= 50 ? "bg-yellow" :
    "bg-red";

  return `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">Transition State</div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <small class="opacity-75">State</small><br>
          <span class="pnl3-badge ${stateBadge}">
            ${data.transition.state}
          </span>
        </div>

        <div class="text-end">
          <small class="opacity-75">Conditions</small><br>
          <strong>${satisfied} / ${total}</strong>
        </div>
      </div>

      <div class="progress" style="height:18px; background:#1c1c1c;">
        <div
          class="progress-bar ${barColor}"
          style="width:${percent}%"
        >
          ${percent}%
        </div>
      </div>
    </div>
  `;
}

function renderBreakout(data) {
  if (!data?.breakout) return `
  <div class="pnl3-section mb-1 p-5">
      <p class="mb-0">No data available.</p>
  </div>
  `;

  const score = data.breakout.score || 0;
  const max = 4;
  const percent = Math.round((score / max) * 100);

  const stateBadge =
    data.breakout.state === "STRONG" ? "badge-buy" :
    data.breakout.state === "CONFIRMED" ? "badge-watch" :
    "badge-sell";

  const barColor =
    percent >= 75 ? "bg-green" :
    percent >= 50 ? "bg-yellow" :
    "bg-red";

  return `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">Breakout</div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <small class="opacity-75">State</small><br>
          <span class="pnl3-badge ${stateBadge}">
            ${data.breakout.state}
          </span>
        </div>

        <div class="text-end">
          <small class="opacity-75">Score</small><br>
          <strong>${score} / ${max}</strong>
        </div>
      </div>

      <div class="progress" style="height:18px; background:#1c1c1c;">
        <div
          class="progress-bar ${barColor}"
          style="width:${percent}%"
        >
          ${percent}%
        </div>
      </div>
    </div>
  `;
}

function getAIDecisionColor(decision) {
  if (decision === "BUY") return "#00ff8c";
  if (decision === "SELL") return "#ff5050";
  if (decision === "NO_TRADE") return "#ffb400";
  return "#6b7280";
}

function renderAIIcon(icon, decision, label) {
  const color = getAIDecisionColor(decision);

  return `
    <div class="ai-icon-wrapper" title="${label}: ${decision ?? "-"}">
      <iconify-icon
        icon="${icon}"
        width="20"
        height="20"
        style="color:${color}"
      ></iconify-icon>
    </div>
  `;
}

async function renderTopMarketCapCards(tokens) {
  const container = document.getElementById("topTokensContainer");
  if (!container) return;
  container.innerHTML = "";
  for (const t of tokens) {
    const card = document.createElement("div");
    card.className = "pnl3-token-card";
    const decision = document.createElement("div");
    decision.className = "pnl3-token-decision";
    decision.innerHTML = `
      ${renderAIIcon(
        "ri:openai-fill",
        t.aiDecision,
        "OpenAI"
      )}

      ${renderAIIcon(
        "lineicons:gemini",
        t.geminiDecision,
        "Gemini"
      )}
    `;

    card.appendChild(decision);
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 160;
    drawMiniChart(canvas, t.prices);
    card.appendChild(canvas);
    const info = document.createElement("div");
    info.className = "pnl3-token-info";
    info.innerHTML = `
      <div>
        <div class="pnl3-token-name">${t.name}</div>
        <div>${formatCompactUSD(t.lastMarketCap)}</div>
      </div>
      <div>
        Volume<br>${formatCompactUSD(t.lastVolume)}
      </div>
    `;
    card.appendChild(info);
    card.onclick = async () => {
      currentTokenAddress = t.tokenAddress;
      const data = await window.oraclePnl.getTokenAnalysis(t.tokenAddress);
      await renderSidebar(t, data);
    };
    container.appendChild(card);
  }
}

function drawMiniChart(canvas, prices) {
  if (!prices || prices.length < 2) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  ctx.beginPath();
  ctx.strokeStyle = "#ffb400";
  ctx.lineWidth = 1.2;
  prices.forEach((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function renderMultiAISection(aiResult) {
  if (!aiResult) {
    return `
      <div class="pnl3-section mb-1">
        <div class="pnl3-section-title">AI Signals</div>
        <small class="opacity-75">No signal</small>
      </div>
    `;
  }

  const decisions = aiResult.decisions
    ? aiResult.decisions
    : [{
        model: aiResult.aiModel || "openai",
        decision: aiResult.decision
      }];

  return `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">AI Signals</div>

      ${decisions.map(d => {
        const badgeClass =
          d.decision === "BUY" ? "badge-buy" :
          d.decision === "SELL" ? "badge-sell" :
          "badge-watch";

        const label =
          d.model.includes("gemini") ? "Gemini" :
          d.model.includes("gpt") ? "OpenAI" :
          d.model;

        return `
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong class="opacity-85">${label}</strong>
            <span class="pnl3-badge ${badgeClass}">
              ${d.decision}
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function renderSidebar(token, data) {
  openSidebar();
  document.getElementById("sidebarTokenName").innerText = `${token.name ?? "-"} (${token.symbol ?? "-"})`;
  document.getElementById("sidebarMarketCap").innerText = formatCompactUSD(token.lastMarketCap);
  document.getElementById("sidebarVolume").innerText = formatCompactUSD(token.lastVolume);

  renderPriceChart(
    document.getElementById("sidebarChart"),
    data.candles1h,
    data.supports1h,
    data.resistances1h
  );

  document.getElementById("sidebarMarket").innerHTML = renderScore(data.score);
  document.getElementById("sidebarTrend").innerHTML = renderTrendPanel(data);
  document.getElementById("sidebarPump").innerHTML = renderPumpPanel(data);
  document.getElementById("sidebarRisk").innerHTML = renderRiskPanel(data);
  document.getElementById("sidebarTransition").innerHTML = renderTransition(data);
  document.getElementById("sidebarBreakout").innerHTML = renderBreakout(data);

  document.getElementById("sidebarAI").innerHTML = `
    <div class="pnl3-section mb-1">
      <div class="pnl3-section-title">AI Signals</div>
      <small class="opacity-75">Analyzing...</small>
    </div>
  `;

  try {
    const aiResult = await window.oraclePnl.getAIDecision(token.tokenAddress);

    document.getElementById("sidebarAI").innerHTML =
      renderMultiAISection(aiResult);

  } catch (e) {
    document.getElementById("sidebarAI").innerHTML = `
      <div class="pnl3-section mb-1">
        <div class="pnl3-section-title">AI Signals</div>
        <small class="text-danger">AI error</small>
      </div>
    `;
  }
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

function calculateSignalRealizedPnL(signal) {
  const startMC = Number(signal.startMarketCap);
  const lastMC  = Number(signal.lastMarketCap);
  if (!Number.isFinite(startMC) || startMC <= 0) return null;
  if (signal.tpStage >= 3) return 250;
  if (signal.tpStage >= 2) return 100;
  if (signal.tpStage >= 1) return 35;
  if (signal.status === 4 && Number.isFinite(lastMC)) {
    return ((lastMC - startMC) / startMC) * 100;
  }
  return 0;
}


function buildEquityCurve(signals) {
  let cumulative = 0;

  return signals
    .filter(s =>
      s.startMarketCap &&
      (s.tpStage > 0 || s.status === 3 || s.status === 4)
    )
    .sort((a, b) =>
      (a.updatedAt || a.createdAt) -
      (b.updatedAt || b.createdAt)
    )
    .map(s => {
      const pnl = calculateSignalRealizedPnL(s);
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
  const mapX = x => ((x - minX) / (maxX - minX || 1)) * (w - 40) + 20;
  const mapY = y => h - (((y - minY) / (maxY - minY || 1)) * (h - 40) + 20);
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

document.querySelectorAll("[data-range]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-range]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentRange = btn.dataset.range;
    updateEquityChart();
  });
});

function openSidebar() {
  document.getElementById("tokenSidebar").classList.add("active");
  document.getElementById("tokenSidebarOverlay").classList.add("active");
}

function closeSidebar() {
  document.getElementById("tokenSidebar").classList.remove("active");
  document.getElementById("tokenSidebarOverlay").classList.remove("active");
}

document.getElementById("closeSidebarBtn").onclick = closeSidebar;
document.getElementById("tokenSidebarOverlay").onclick = closeSidebar;

let refreshInProgress = false;

async function refreshDashboard() {
  if (refreshInProgress) return;
  refreshInProgress = true;

  try {
    const [tokens, topTokens] = await Promise.all([
      window.oraclePnl.getActiveTokens(),
      window.oraclePnl.getTopMarketCapTokens()
    ]);

    renderTable(tokens);
    renderTopMarketCapCards(topTokens);

  } catch (err) {
    console.error("[DASHBOARD REFRESH ERROR]", err);
  } finally {
    refreshInProgress = false;
  }
}

refreshDashboard();
setInterval(refreshDashboard, 10000);