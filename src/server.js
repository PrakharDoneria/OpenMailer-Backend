const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const env = require("./config/env");
const logger = require("./config/logger");
const api = require("./routes/api");
const { notFound, errorHandler } = require("./middlewares/errors");
const { provisionResources } = require("../scripts/setup-catalyst");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(pinoHttp({ logger }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.post("/init-tables", async (_req, res, next) => {
  try {
    const resources = await provisionResources();
    res.status(200).json({ data: { initialized: true, resources } });
  } catch (error) {
    next(error);
  }
});
app.use("/api/v1", api);
app.use(notFound);
app.use(errorHandler);

if (require.main === module) app.listen(env.PORT, () => logger.info({ port: env.PORT }, "OpenMailer listening"));

module.exports = app;
