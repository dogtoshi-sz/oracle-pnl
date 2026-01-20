const MAX_SNAPSHOTS = 1440;
const tokenMemory = new Map();

function clearTokenMemory(tokenAddress) {
  tokenMemory.delete(tokenAddress);
}

function getTokenMemory(tokenAddress) {
  return tokenMemory.get(tokenAddress) || [];
}

function getLatestSnapshot(tokenAddress) {
  const history = tokenMemory.get(tokenAddress);
  if (!history || history.length === 0) return null;
  return history[history.length - 1];
}

function setTokenMemory(tokenAddress, snapshot) {
  let history = tokenMemory.get(tokenAddress);
  if (!history) { history = []; }
  history.push(snapshot);
  if (history.length > MAX_SNAPSHOTS) {
    history.shift();
  }
  tokenMemory.set(tokenAddress, history);
}

module.exports = {
  getTokenMemory,
  getLatestSnapshot,
  setTokenMemory,
  clearTokenMemory,
};