const env = require("../config/env");

function requireInboundSecret(req, res, next) {
  if (req.get("x-inbound-webhook-secret") !== env.INBOUND_WEBHOOK_SECRET) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid inbound webhook secret" } });
  return next();
}

module.exports = { requireInboundSecret };
