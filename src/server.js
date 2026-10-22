const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");
const env = require("./config/env");
const logger = require("./config/logger");
const api = require("./routes/api");
const { notFound, errorHandler } = require("./middlewares/errors");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(pinoHttp({ logger }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/v1", api);
app.use(notFound);
app.use(errorHandler);

if (require.main === module) app.listen(env.PORT, () => logger.info({ port: env.PORT }, "OpenMailer listening"));

module.exports = app;
