const { getDb } = require("../../database");
const { analyzeTokenRawAI } = require("./aiAnalyzeTokenRaw");
const { openAIAnalyze } = require("./openaiClient");
const { geminiAIAnalyze } = require("./geminiClient");
const { handleBuySellSignal } = require("./handleBuySignal");
const crypto = require("crypto");

const AI_INTERVAL_MS = 3 * 60 * 1000;
const MAX_TOKENS_PER_RUN = 5; // Reduced from 30 to avoid rate limits
const MAX_RUNTIME_MS = 30_000;
const MIN_VOLUME = 100_000;

function hashSnapshot(snapshot) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
}

function deepFreeze(obj) {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    Object.values(obj).forEach(deepFreeze);
  }
  return obj;
}

async function runAIScheduler() {
  const db = getDb();
  const startedAt = Date.now();

  const tokens = db.prepare(`
    SELECT
      t.tokenAddress,
      t.lastAICheckAt,
      t.lastVolume,

      (
        SELECT status
        FROM tokenSignals s
        WHERE s.tokenAddress = t.tokenAddress
        ORDER BY updatedAt DESC
        LIMIT 1
      ) AS signalStatus

    FROM tokensData t
    WHERE t.status = 'active'
    ORDER BY t.lastAICheckAt ASC NULLS FIRST
    LIMIT ?
  `).all(MAX_TOKENS_PER_RUN);

  for (const token of tokens) {
    if (Date.now() - startedAt > MAX_RUNTIME_MS) break;

    const {
      tokenAddress,
      lastAICheckAt,
      lastVolume,
      signalStatus
    } = token;

    try {
      if (signalStatus === 1) continue;
      if (!lastVolume || lastVolume < MIN_VOLUME) continue;
      if (lastAICheckAt && Date.now() - lastAICheckAt < AI_INTERVAL_MS) continue;

      const snapshotCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM tokenSnapshots
        WHERE tokenAddress = ?
      `).get(tokenAddress)?.count || 0;

      if (snapshotCount < 100) continue;

      const candleCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM tokenCandles
        WHERE tokenAddress = ?
      `).get(tokenAddress)?.count || 0;

      if (candleCount < 100) continue;

      const lastDecision = db.prepare(`
        SELECT snapshotHash
        FROM tokenAIDecisions
        WHERE tokenAddress = ?
        ORDER BY createdAt DESC
        LIMIT 1
      `).get(tokenAddress);

      const snapshot = await analyzeTokenRawAI(tokenAddress);
      if (!snapshot || !snapshot.token) continue;

      deepFreeze(snapshot);

      const snapshotHash = hashSnapshot(snapshot);
      const decisionRaw = JSON.stringify(snapshot);

      if (lastDecision && lastDecision.snapshotHash === snapshotHash) {
        db.prepare(`
          UPDATE tokensData
          SET lastAICheckAt = ?
          WHERE tokenAddress = ?
        `).run(Date.now(), tokenAddress);
        continue;
      }

      // Call AI services sequentially with delays to avoid rate limits
      const aiResults = [];
      
      // OpenAI call
      try {
        const openaiDecision = await openAIAnalyze(snapshot, []);
        aiResults.push({ status: 'fulfilled', value: openaiDecision });
      } catch (err) {
        if (err.status === 429 || err.message?.includes('429')) {
          console.warn("[RATE LIMIT] OpenAI rate limited");
        }
        aiResults.push({ status: 'rejected', reason: err });
      }
      
      // Wait 1 second before calling Gemini
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Gemini call
      try {
        const geminiDecision = await geminiAIAnalyze(snapshot, []);
        aiResults.push({ status: 'fulfilled', value: geminiDecision });
      } catch (err) {
        if (err.status === 429 || err.message?.includes('429')) {
          console.warn("[RATE LIMIT] Gemini rate limited");
        }
        aiResults.push({ status: 'rejected', reason: err });
      }
      
      // Add delay between tokens to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between tokens

      const now = Date.now();
      const decisions = [];

      const insertStmt = db.prepare(`
        INSERT INTO tokenAIDecisions
        (tokenAddress, tokenName, aiModel, decision, snapshotHash, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const [index, result] of aiResults.entries()) {
        if (result.status !== "fulfilled") {
          console.error(
            index === 0 ? "[OPENAI ERROR]" : "[GEMINI ERROR]",
            tokenAddress,
            result.reason?.message
          );
          continue;
        }

        const model =
          index === 0 ? "gpt-4o-mini" : "gemini-2.0-flash";

        const decision = result.value;
        decisions.push(decision);

        insertStmt.run(
          tokenAddress,
          snapshot.token.name,
          model,
          decision,
          snapshotHash,
          now
        );
      }

      if (decisions.length === 0) continue;

      const allBuy = decisions.every(d => d === "BUY");

      if (!allBuy) {
        continue;
      }

      handleBuySellSignal({
        token: { tokenAddress },
        decision: "BUY",
        decisionRaw
      });


      db.prepare(`
        UPDATE tokensData
        SET lastAICheckAt = ?
        WHERE tokenAddress = ?
      `).run(now, tokenAddress);

    } catch (err) {
      console.error("[AI SCHEDULER ERROR]", tokenAddress, err.message);
    }
  }

  console.log("[AI] Scheduler cycle complete");
}

module.exports = {
  runAIScheduler
};