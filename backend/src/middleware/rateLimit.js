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

const isProd = process.env.NODE_ENV === "production";

const authLimiter = createLimiter(15 * 60 * 1000, isProd ? 5 : 100, RATE_LIMIT_MESSAGES.auth);
const executeLimiter = createLimiter(60 * 1000, isProd ? 10 : 200, RATE_LIMIT_MESSAGES.execute);
const generalLimiter = createLimiter(60 * 1000, isProd ? 100 : 1000, RATE_LIMIT_MESSAGES.general);

module.exports = { authLimiter, executeLimiter, generalLimiter };

