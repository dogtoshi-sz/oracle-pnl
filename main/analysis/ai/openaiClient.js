const OpenAI = require("openai");
const { getSetting } = require("../../state/settings");

let client = null;

function getOpenAIClient() {
  if (client) return client;
  const apiKey = getSetting("openai.apiKey");
  if (!apiKey) { throw new Error("OpenAI API key not found in settings"); }
  client = new OpenAI({ apiKey });
  return client;
}

async function openAIAnalyze(snapshot, history = []) {
  const prompt = getSetting(
    "openai.prompt.momentum",
    ""
  );

  if (!prompt) { throw new Error("OpenAI prompt not found in settings"); }
  const client = getOpenAIClient();
  
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are conservative, rule-based, and deterministic."
        },
        {
          role: "user",
          content: prompt
        },
        {
          role: "user",
          content: `
SNAPSHOT:
${JSON.stringify(snapshot)}

PREVIOUS DECISIONS:
${JSON.stringify(history)}
`
        }
      ]
    });

    const decision = response.choices[0].message.content
      .trim()
      .toUpperCase();

    if (!["BUY", "NO_TRADE"].includes(decision)) {
      throw new Error(`Invalid AI decision: ${decision}`);
    }

    return decision;
  } catch (err) {
    // Don't retry on invalid API key (401)
    if (err.status === 401 || err.message?.includes('401') || err.message?.includes('Incorrect API key')) {
      console.error("[OPENAI] Invalid API key - please update your OpenAI API key in settings");
      throw new Error("Invalid OpenAI API key");
    }
    throw err;
  }
}

module.exports = {
  openAIAnalyze
};
