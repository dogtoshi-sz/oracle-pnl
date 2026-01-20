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

function formatSignalStatus(signal) {
  if (signal.status === 4) {
    return `<span class="pnl3-badge badge-sell">STOPLOSS</span>`;
  }

  if (signal.status === 3) {
    return `<span class="pnl3-badge badge-buy">CLOSED</span>`;
  }

  if (signal.status === 1) {
    if (signal.tpStage === 1) {
      return `<span class="pnl3-badge badge-buy">TP1 SOLD</span>`;
    }
    if (signal.tpStage === 2) {
      return `<span class="pnl3-badge badge-buy">TP2 SOLD</span>`;
    }
    if (signal.tpStage === 3) {
      return `<span class="pnl3-badge badge-buy">FULL SOLD</span>`;
    }
    return `<span class="pnl3-badge badge-watch">OPEN</span>`;
  }

  return `<span class="opacity-50">-</span>`;
}

function renderSignalPnL(signal) {
  const startMC = Number(signal.startMarketCap);
  const lastMC  = Number(signal.lastMarketCap);

  if (!Number.isFinite(startMC) || startMC <= 0) {
    return `<span class="opacity-50">-</span>`;
  }

  let realized = 0;
  let remaining = 1;

  if (signal.tpStage >= 1) {
    realized += 0.30 * 35;
    remaining -= 0.30;
  }
  if (signal.tpStage >= 2) {
    realized += 0.30 * 100;
    remaining -= 0.30;
  }
  if (signal.tpStage >= 3) {
    realized += 0.40 * 250;
    remaining = 0;
  }

  let unrealized = 0;
  if (remaining > 0 && Number.isFinite(lastMC)) {
    unrealized =
      remaining *
      ((lastMC - startMC) / startMC) *
      100;
  }

  const totalPnl = realized + unrealized;
  const NEG_ZONE = 20;
  const POS_ZONE = 80;
  const NEG_MAX = 35;
  const POS_MAX = 250;
  const negRatio =
    totalPnl < 0
      ? Math.min(1, Math.abs(totalPnl) / NEG_MAX)
      : 0;

  const posRatio =
    totalPnl > 0
      ? Math.min(1, totalPnl / POS_MAX)
      : 0;

  const tpPos = v => {
    const ratio = Math.min(1, v / POS_MAX);
    return NEG_ZONE + ratio * POS_ZONE;
  };

  const tp1Pos = tpPos(35);
  const tp2Pos = tpPos(100);
  const tp3Pos = tpPos(250);

  const tp1Cls = signal.tpStage >= 1 ? "hit" : "";
  const tp2Cls = signal.tpStage >= 2 ? "hit" : "";
  const tp3Cls = signal.tpStage >= 3 ? "hit" : "";

  const pnlCls = totalPnl > 0 ? "pnl-pos" : totalPnl < 0 ? "pnl-neg" : "";

  return `
    <div class="pnl-cell">
      <div class="pnl-value ${pnlCls}">
        ${totalPnl.toFixed(1)}%
      </div>

      <div class="pnl-bar">
        <div class="pnl-neg-zone" style="flex:${NEG_ZONE}">
          <div class="pnl-fill-neg" style="width:${negRatio * 100}%"></div>
        </div>

        <div class="pnl-pos-zone" style="flex:${POS_ZONE}">
          <div class="pnl-fill-pos" style="width:${posRatio * 100}%"></div>
        </div>

        <div class="pnl-bar-tp tp1 ${tp1Cls}" style="left:${tp1Pos}%"></div>
        <div class="pnl-bar-tp tp2 ${tp2Cls}" style="left:${tp2Pos}%"></div>
        <div class="pnl-bar-tp tp3 ${tp3Cls}" style="left:${tp3Pos}%"></div>
      </div>
    </div>
  `;
}

export function renderSignalsTable({
  tableSelector,
  signals
}) {
  const tableBody = document.querySelector(
    `${tableSelector} tbody`
  );

  if (!tableBody) return;

  tableBody.innerHTML = "";

  for (const s of signals) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="small text-gray">${formatTimeAgo(s.createdAt)}</td>
      <td>
        <strong>${s.name ?? "-"}</strong><br>
        <small class="opacity-50">
          ${s.symbol ?? "-"} · ${formatAddress(s.tokenAddress)}
        </small>
      </td>
      <td>${formatCompactUSD(s.startMarketCap)}</td>
      <td>${formatCompactUSD(s.lastMarketCap)}</td>
      <td>${renderSignalPnL(s)}</td>
      <td>${formatSignalStatus(s)}</td>
    `;

    tableBody.appendChild(tr);
  }
}
