function classifyNewToken(token) {
  let tier = 1;

  if (token.source === "pumpfun") {
    tier = 2;
  }

  return {
    ...token,
    tier,
    status: "active",
  };
}

module.exports = {
  classifyNewToken,
};