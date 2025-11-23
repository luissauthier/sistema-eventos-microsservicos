require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const routes = require("./routes");
const logger = require("./config/logger");

const app = express();

app.use(express.json());

// Middleware de Log de Request (Interceptor)
app.use((req, res, next) => {
  const { method, url } = req;
  const start = Date.now();

  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  
  res.setHeader('X-Request-ID', requestId);
  req.requestId = requestId;

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info("http_request", { 
      method, 
      url, 
      status: res.statusCode, 
      duration_ms: duration,
      requestId: requestId
    });
  });

  next();
});

app.use(routes);

app.use((err, req, res, next) => {
  logger.error("unhandled_error", { 
    error: err.message, 
    stack: err.stack,
    requestId: req.requestId 
  });
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 8004;
app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});