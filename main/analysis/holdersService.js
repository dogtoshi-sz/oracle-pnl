const { Connection, PublicKey } = require("@solana/web3.js");
const { getSetting } = require("../state/settings");

let connection = null;

function getSolanaConnection() {
  if (connection) return connection;
  const rpcUrl = getSetting("rpc.solana.mainnet","https://api.mainnet-beta.solana.com");
  const commitment = getSetting("rpc.solana.commitment","confirmed");
  connection = new Connection(rpcUrl, commitment);
  return connection;
}

async function getApproxHolders(tokenMint) {
  try {
    const conn = getSolanaConnection();
    const mint = new PublicKey(tokenMint);
    const largest = await conn.getTokenLargestAccounts(mint);
    if (!largest?.value?.length) return null;
    const holders = largest.value.map(a => Number(a.amount)).filter(a => a > 0);
    const supplyRes = await conn.getTokenSupply(mint);
    const totalSupply = Number(supplyRes.value.amount);
    if (!totalSupply || holders.length === 0) {
      return holders.length;
    }

    const topSum = holders.reduce((a, b) => a + b, 0);
    const concentration = topSum / totalSupply;

    let approx;

    if (concentration > 0.8) {
      approx = holders.length * 2;
    } else if (concentration > 0.6) {
      approx = holders.length * 4;
    } else if (concentration > 0.4) {
      approx = holders.length * 8;
    } else if (concentration > 0.2) {
      approx = holders.length * 15;
    } else {
      approx = holders.length * 25;
    }

    return Math.min(Math.round(approx), 50_000);

  } catch (err) {
    console.error("[HOLDERS RPC ERROR]", tokenMint, err.message);
    return null;
  }
}

module.exports = {
  getApproxHolders
};
