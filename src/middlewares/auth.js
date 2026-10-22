const env = require("../config/env");

function requireApiKey(req, res, next) {
  if (req.get("authorization") !== `Bearer ${env.API_KEY}`) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Valid bearer token required" } });
  return next();
}

function requireInboundSecret(req, res, next) {
  if (req.get("x-inbound-webhook-secret") !== env.INBOUND_WEBHOOK_SECRET) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid inbound webhook secret" } });
  return next();
}

module.exports = { requireApiKey, requireInboundSecret };
