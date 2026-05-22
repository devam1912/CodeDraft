const logger = require("../utils/logger");
const { sendError } = require("../utils/response");

const errorHandler = (err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again later."
      : err.message || "Internal Server Error";

  return sendError(res, statusCode, message);
};

module.exports = errorHandler;
