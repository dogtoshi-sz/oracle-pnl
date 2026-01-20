const { buildTokenRawAISnapshot } = require("./buildTokenRawAISnapshot");

async function analyzeTokenRawAI(tokenAddress) {
  return buildTokenRawAISnapshot(tokenAddress);
}

module.exports = {
  analyzeTokenRawAI
};