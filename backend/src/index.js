require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const configureSockets = require("./config/socket");
const initExpiryCron = require("./config/expiryCron");

const connectDB = require("./config/db");
const validateEnv = require("./config/validateEnv");
const errorHandler = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimit");
const logger = require("./utils/logger");
const { sendSuccess } = require("./utils/response");
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");

validateEnv();

const app = express();
const server = http.createServer(app);
const io = configureSockets(server);
app.set("io", io);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

if (process.env.NODE_ENV !== "production") {
  app.use(
    morgan("dev", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

app.get("/api/health", (req, res) => {
  return sendSuccess(res, 200, { status: "healthy", uptime: process.uptime() }, "Server is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10);

const startServer = async () => {
  try {
    await connectDB();
    initExpiryCron();

    server.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

module.exports = app;
