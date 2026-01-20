const { GoogleGenAI } = require("@google/genai");
const { getSetting } = require("../../state/settings");

let client = null;

function getGeminiClient() {
  if (client) return client;

  const apiKey = getSetting("gemini.apiKey");
  if (!apiKey) {
    throw new Error("Gemini API key not found in settings");
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

async function geminiAIAnalyze(snapshot, history = []) {
  const prompt = getSetting("gemini.prompt.momentum", "");

  if (!prompt) {
    throw new Error("Gemini prompt not found in settings");
  }

  const client = getGeminiClient();

  const fullPrompt = `
${prompt}

SNAPSHOT:
${JSON.stringify(snapshot)}

PREVIOUS DECISIONS:
${JSON.stringify(history)}
`.trim();

  const response = await client.models.generateContent({
    model: getSetting("gemini.model", "gemini-2.0-flash"),
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }]
      }
    ],
    generationConfig: {
      temperature: getSetting("gemini.temperature", 0.2),
      maxOutputTokens: getSetting("gemini.maxOutputTokens", 20)
    }
  });

  const text =
    response?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  const decision = text.trim().toUpperCase();

  if (!["BUY", "NO_TRADE"].includes(decision)) {
    throw new Error(`Invalid Gemini decision: ${decision}`);
  }

  return decision;
}

module.exports = {
  geminiAIAnalyze
};