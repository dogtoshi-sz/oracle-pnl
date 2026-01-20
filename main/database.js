const Database = require("better-sqlite3");

let db = null;

function initDatabase(dbPath) {
  if (db) return db;

  if (!dbPath) {
    throw new Error("initDatabase requires a valid dbPath");
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("busy_timeout = 8000");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenSignals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tokenAddress TEXT NOT NULL,
      name TEXT,
      symbol TEXT,
      startMarketCap REAL,
      lastMarketCap REAL,
      status INTEGER,
      tpStage INTEGER DEFAULT 0,
      peakMarketCap REAL,
      openedAt INTEGER,
      createdAt INTEGER,
      updatedAt INTEGER,
      decisionRaw TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenSnapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tokenAddress TEXT NOT NULL,
      price REAL,
      marketCap REAL,
      volume REAL,
      liquidity REAL,
      dexId TEXT,
      timestamp INTEGER,
      holders INTEGER DEFAULT 0
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenCandles (
      tokenAddress TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      PRIMARY KEY (tokenAddress, timeframe, timestamp)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenBuySellScore (
      tokenAddress TEXT PRIMARY KEY,
      buyScore REAL,
      sellScore REAL,
      decision TEXT,
      confidence REAL,
      calculatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenPumpScore (
      tokenAddress TEXT PRIMARY KEY,
      pumpScore REAL,
      label TEXT,
      calculatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenRiskProfile (
      tokenAddress TEXT PRIMARY KEY,
      riskLevel TEXT,
      expectedMove TEXT,
      failureRisk INTEGER,
      setupQuality INTEGER,
      calculatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenSupportResistance (
      tokenAddress TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      support_json TEXT,
      resistance_json TEXT,
      lastCalculatedAt INTEGER,
      PRIMARY KEY (tokenAddress, timeframe)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenTiming15m (
      tokenAddress TEXT PRIMARY KEY,
      entryQuality REAL,
      momentum15m REAL,
      volatility REAL,
      timingSignal TEXT,
      calculatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenTransitionState (
      tokenAddress TEXT PRIMARY KEY,
      state TEXT,
      satisfiedConditions INTEGER,
      conditions_json TEXT,
      calculatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenTrendBias (
      tokenAddress TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      trend TEXT,
      trend_strength REAL,
      price_position TEXT,
      calculatedAt INTEGER,
      PRIMARY KEY (tokenAddress, timeframe)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenVolumeAnomaly (
      tokenAddress TEXT PRIMARY KEY,
      volumeRatio REAL,
      anomaly INTEGER,
      calculatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenAIDecisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tokenAddress TEXT NOT NULL,
      tokenName TEXT,
      aiModel TEXT,
      decision TEXT,
      snapshotHash TEXT,
      createdAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokenBreakoutState (
      tokenAddress TEXT PRIMARY KEY,
      state TEXT, 
      score INTEGER,
      resistance REAL,
      calculatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settingsData (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      value TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    );
  `);

  db.exec(`
    INSERT OR IGNORE INTO settingsData (key, value, createdAt, updatedAt) VALUES

    (
      'rpc.solana.mainnet',
      'https://api.mainnet-beta.solana.com',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'rpc.solana.commitment',
      'confirmed',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),

    (
      'openai.apiKey',
      '',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'openai.prompt.momentum',
      '',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),

    (
      'gemini.apiKey',
      '',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'gemini.prompt.momentum',
      '',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'gemini.model',
      'gemini-2.0-flash',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'gemini.temperature',
      '0.2',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'gemini.maxOutputTokens',
      '20',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),

    (
      'signal.stopLossPct',
      '-0.25',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'signal.tp1Pct',
      '0.35',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'signal.tp2Pct',
      '1.0',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'signal.tp3Pct',
      '2.5',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'signal.maxHoldMinutes',
      '90',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'signal.noNewHighMinutes',
      '45',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    ),
    (
      'signal.noNewHighDropRatio',
      '0.9',
      strftime('%s','now')*1000,
      strftime('%s','now')*1000
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS agentsData (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      provider TEXT,
      model TEXT,
      config TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS walletsData (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      address TEXT UNIQUE,
      network TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tradesData (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      walletId INTEGER,
      tokenAddress TEXT,
      side TEXT,
      amount REAL,
      price REAL,
      status TEXT,
      createdAt INTEGER,
      updatedAt INTEGER,
      FOREIGN KEY (walletId) REFERENCES walletsData(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokensData (
      tokenAddress TEXT PRIMARY KEY,
      name TEXT,
      symbol TEXT,
      source TEXT,

      tier INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',

      lastPrice REAL,
      lastMarketCap REAL,
      lastVolume REAL,
      lastLiquidity REAL,
      lastHolders INTEGER,

      trendDirection TEXT,
      trendStrength REAL,
      supportLevel REAL,
      resistanceLevel REAL,
      volatilityScore REAL,

      createdAt INTEGER,
      updatedAt INTEGER,
      lastAICheckAt INTEGER
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_token_active_signal
      ON tokenSignals(tokenAddress)
      WHERE status = 1;

    CREATE INDEX IF NOT EXISTS idx_tokenCandles_lookup
      ON tokenCandles(tokenAddress, timeframe, timestamp);

    CREATE INDEX IF NOT EXISTS idx_ai_token
      ON tokenAIDecisions(tokenAddress);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tokens_status
      ON tokensData(status);

    CREATE INDEX IF NOT EXISTS idx_tokens_marketcap
      ON tokensData(lastMarketCap DESC);

    CREATE INDEX IF NOT EXISTS idx_trades_wallet
      ON tradesData(walletId);
  `);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase first.");
  }
  return db;
}

module.exports = {
  initDatabase,
  getDb
};