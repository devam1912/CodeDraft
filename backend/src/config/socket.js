const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const logger = require("../utils/logger");

const configureSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error("Authentication error: No cookies found"));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.codedraft_token;

      if (!token) {
        return next(new Error("Authentication error: Token not found"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      logger.error(`Socket connection authentication failed: ${error.message}`);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`New authenticated socket connection: ${socket.id} (User: ${socket.userId})`);

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${socket.userId})`);
    });
  });

  return io;
};

module.exports = configureSockets;
