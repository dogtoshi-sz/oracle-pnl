const { getDb } = require("../database");
const cache = new Map();

function loadSettings() {
  const db = getDb();
  const rows = db.prepare(`SELECT key, value FROM settingsData`).all();
  cache.clear();
  for (const row of rows) {
    cache.set(row.key, parseValue(row.value));
  }
}

function parseValue(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (!isNaN(raw) && raw !== "") return Number(raw);
  if (
    (raw.startsWith("{") && raw.endsWith("}")) ||
    (raw.startsWith("[") && raw.endsWith("]"))
  ) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

function getSetting(key, defaultValue = null) {
  if (cache.has(key)) { return cache.get(key); }
  return defaultValue;
}

function setSetting(key, value) {
  const db = getDb();
  const now = Date.now();
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  db.prepare(`
    INSERT INTO settingsData (key, value, createdAt, updatedAt)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updatedAt = excluded.updatedAt
  `).run(key, stringValue, now, now);
  cache.set(key, value);
}

module.exports = {
  loadSettings,
  getSetting,
  setSetting
};
