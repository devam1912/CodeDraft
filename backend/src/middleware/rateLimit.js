const rateLimit = require("express-rate-limit");
const { sendError } = require("../utils/response");

const RATE_LIMIT_MESSAGES = {
  auth: "Too many authentication attempts. Please try again after 15 minutes.",
  execute: "Too many code execution requests. Please try again after 1 minute.",
  general: "Too many requests. Please slow down.",
};

const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return sendError(res, 429, message);
    },
  });
};

const authLimiter = createLimiter(15 * 60 * 1000, 5, RATE_LIMIT_MESSAGES.auth);
const executeLimiter = createLimiter(60 * 1000, 10, RATE_LIMIT_MESSAGES.execute);
const generalLimiter = createLimiter(60 * 1000, 100, RATE_LIMIT_MESSAGES.general);

module.exports = { authLimiter, executeLimiter, generalLimiter };
