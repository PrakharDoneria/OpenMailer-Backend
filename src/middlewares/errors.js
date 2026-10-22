function notFound(_req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: { code: status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR", message: status === 500 ? "An unexpected error occurred" : err.message } });
}

module.exports = { notFound, errorHandler };
