const path = require("path");
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const { Worker } = require("worker_threads");
const crypto = require("crypto");

const { initDatabase, getDb } = require("./database");
const { loadSettings, getSetting } = require("./state/settings");
const dbPath = path.join(app.getPath("userData"), "oracle-pnl.db");
initDatabase(dbPath);
loadSettings();
const db = getDb();

const { getMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getOrCreateAssociatedTokenAccount, transfer, burn } = require('@solana/spl-token');
const { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, TransactionInstruction, clusterApiUrl, VersionedTransaction, ComputeBudgetProgram, Keypair, sendAndConfirmTransaction, SystemProgram } = require('@solana/web3.js');
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

const rpcUrl = getSetting("rpc.solana.mainnet","https://api.mainnet-beta.solana.com");
const commitment = getSetting("rpc.solana.commitment","confirmed");
const connection = new Connection(rpcUrl, commitment);

let schedulerWorker;

function startSchedulerWorker() {
  schedulerWorker = new Worker(
    path.join(__dirname, "scheduler.worker.js"),
    {
      workerData: { dbPath }
    }
  );

  schedulerWorker.on("error", err => {
    console.error("[SCHEDULER WORKER ERROR]", err);
  });

  schedulerWorker.on("exit", code => {
    if (code !== 0) {
      console.warn("[SCHEDULER WORKER CRASHED]", code);
      setTimeout(startSchedulerWorker, 3000);
    }
  });
}

const { runDatabaseCleanup } = require("./runDatabaseCleanup");
const { upsertToken, getActiveTokensForTable, getTokensNeedingUpdate, getTopMarketCapTokens } = require("./tokens/tokenRepository");
const { openAIAnalyze } = require("./analysis/ai/openaiClient");
const { geminiAIAnalyze } = require("./analysis/ai/geminiClient");
const { analyzeTokenRawAI } = require("./analysis/ai/aiAnalyzeTokenRaw");

function hashSnapshot(snapshot) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../assets/javascripts/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on("did-finish-load", () => {
    const tokens = getActiveTokensForTable();
    win.webContents.send("active-tokens-updated", tokens);
  });

  win.loadFile(path.join(__dirname, "../index.html"));
  // win.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  startSchedulerWorker();
  setInterval(runDatabaseCleanup, 60 * 1000);
  ipcMain.handle("get-active-tokens", async () => {
    return getActiveTokensForTable();
  });

  ipcMain.handle("get-app-root", () => {
    return path.join(__dirname, ".."); 
  });

  ipcMain.handle("get-token-analysis", async (_, tokenAddress) => {
    const candles1h = db.prepare(`
      SELECT timestamp, close
      FROM tokenCandles
      WHERE tokenAddress = ?
        AND timeframe = '1h'
      ORDER BY timestamp DESC
      LIMIT 60
    `).all(tokenAddress).reverse();

    const sr1h = db.prepare(`
      SELECT support_json, resistance_json
      FROM tokenSupportResistance
      WHERE tokenAddress = ?
        AND timeframe = '1h'
    `).get(tokenAddress);

    const trend4h = db.prepare(`
      SELECT trend, trend_strength, price_position
      FROM tokenTrendBias
      WHERE tokenAddress = ?
        AND timeframe = '4h'
    `).get(tokenAddress);

    const score = db.prepare(`
      SELECT buyScore, sellScore, decision, confidence
      FROM tokenBuySellScore
      WHERE tokenAddress = ?
    `).get(tokenAddress);

    const timing15m = db.prepare(`
      SELECT entryQuality, momentum15m, volatility, timingSignal
      FROM tokenTiming15m
      WHERE tokenAddress = ?
    `).get(tokenAddress);

    const volume = db.prepare(`
      SELECT volumeRatio, anomaly
      FROM tokenVolumeAnomaly
      WHERE tokenAddress = ?
    `).get(tokenAddress);

    const pump = db.prepare(`
      SELECT pumpScore, label
      FROM tokenPumpScore
      WHERE tokenAddress = ?
    `).get(tokenAddress);

    const risk = db.prepare(`
      SELECT riskLevel, expectedMove, failureRisk, setupQuality
      FROM tokenRiskProfile
      WHERE tokenAddress = ?
    `).get(tokenAddress);

    const transitionRow = db.prepare(`
      SELECT state, satisfiedConditions, conditions_json
      FROM tokenTransitionState
      WHERE tokenAddress = ?
    `).get(tokenAddress);

    const transition = transitionRow ? {
      state: transitionRow.state,
      satisfiedConditions: transitionRow.satisfiedConditions,
      totalConditions: 5,
      conditions: JSON.parse(transitionRow.conditions_json || "{}")
    } : null;
    
    const breakout = db.prepare(`
      SELECT state, score
      FROM tokenBreakoutState
      WHERE tokenAddress = ?
    `).get(tokenAddress);

    return {
      candles1h,
      supports1h: sr1h ? JSON.parse(sr1h.support_json) : [],
      resistances1h: sr1h ? JSON.parse(sr1h.resistance_json) : [],
      trend4h,
      score,
      timing15m,
      volume,
      pump,
      risk,
      transition,
      breakout
    };
  });

  ipcMain.handle("get-ai-decision", async (_, tokenAddress) => {
    if (!tokenAddress) {
      return { error: "No token address provided" };
    }

    const snapshot = await analyzeTokenRawAI(tokenAddress);
    if (!snapshot || !snapshot.token) {
      return { error: "Insufficient snapshot data" };
    }

    const snapshotHash = hashSnapshot(snapshot);

    const lastDecision = db.prepare(`
      SELECT decision, createdAt, snapshotHash, aiModel
      FROM tokenAIDecisions
      WHERE tokenAddress = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(tokenAddress);

    if (lastDecision && lastDecision.snapshotHash === snapshotHash) {
      return {
        decision: lastDecision.decision,
        aiModel: lastDecision.aiModel,
        createdAt: lastDecision.createdAt,
        cached: true
      };
    }

    const history = db.prepare(`
      SELECT decision, createdAt
      FROM tokenAIDecisions
      WHERE tokenAddress = ?
      ORDER BY createdAt DESC
      LIMIT 5
    `).all(tokenAddress);

    const results = await Promise.allSettled([
      openAIAnalyze(snapshot, history),
      geminiAIAnalyze(snapshot, history)
    ]);

    const now = Date.now();
    const decisions = [];

    if (results[0].status === "fulfilled") {
      decisions.push({
        model: "gpt-4o-mini",
        decision: results[0].value
      });
    } else {
      console.error("[OPENAI ERROR]", results[0].reason?.message);
    }

    if (results[1].status === "fulfilled") {
      decisions.push({
        model: "gemini-2.0-flash",
        decision: results[1].value
      });
    } else {
      console.error("[GEMINI ERROR]", results[1].reason?.message);
    }

    if (!decisions.length) {
      return { error: "All AI providers failed" };
    }
    
    const insertStmt = db.prepare(`
      INSERT INTO tokenAIDecisions
      (tokenAddress, tokenName, aiModel, decision, snapshotHash, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertTx = db.transaction((rows) => {
      for (const r of rows) {
        insertStmt.run(
          tokenAddress,
          snapshot.token.name,
          r.model,
          r.decision,
          snapshotHash,
          now
        );
      }
    });

    insertTx(decisions);

    return {
      decisions,
      createdAt: now,
      cached: false
    };
  });

  ipcMain.handle("get-top-marketcap-tokens", async () => {
    const tokens = getTopMarketCapTokens(12);

    for (const t of tokens) {
      const candles = db.prepare(`
        SELECT close
        FROM tokenCandles
        WHERE tokenAddress = ?
          AND timeframe = '15m'
        ORDER BY timestamp DESC
        LIMIT 30
      `).all(t.tokenAddress).reverse();

      t.prices = candles.map(c => c.close);
    }

    return tokens;
  });

  ipcMain.handle("get-token-signals", () => {
    const db = getDb();
    return db.prepare(`
      SELECT
        tokenAddress,
        name,
        symbol,
        startMarketCap,
        lastMarketCap,
        status,
        tpStage,
        peakMarketCap,
        createdAt,
        openedAt,
        updatedAt
      FROM tokenSignals
      ORDER BY createdAt DESC
    `).all();
  });

});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});