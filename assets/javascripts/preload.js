const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appPaths", {
  getRoot: () => ipcRenderer.invoke("get-app-root")
});

contextBridge.exposeInMainWorld("oraclePnl", {
  getActiveTokens: () => ipcRenderer.invoke("get-active-tokens"),
  getTokenAnalysis: (tokenAddress) => ipcRenderer.invoke("get-token-analysis", tokenAddress),
  onActiveTokensUpdated: (cb) => ipcRenderer.on("active-tokens-updated", (_, data) => cb(data)),
  analyzeTokenAI: (tokenAddress) => ipcRenderer.invoke("analyze-token-ai-raw", tokenAddress),
  getTopMarketCapTokens: () => ipcRenderer.invoke("get-top-marketcap-tokens"),
  getAIDecision: (tokenAddress) => ipcRenderer.invoke("get-ai-decision", tokenAddress),
  getTokenSignals: () => ipcRenderer.invoke("get-token-signals"),
});
