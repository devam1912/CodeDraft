const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const logger = require("../utils/logger");

const registerMatchHandlers = require("../sockets/matchHandler");

const configureSockets = (server) => {
  // Support comma-separated CLIENT_URL for multiple allowed origins
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
    : [];

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token) {
        token = socket.handshake.query?.token;
      }

      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
          const cookies = cookie.parse(cookieHeader);
          token = cookies.codedraft_token;
        }
      }

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
    
    // Join a room unique to the user so we can emit targeted notifications/events to all of their active connections
    socket.join(socket.userId.toString());

    registerMatchHandlers(io, socket);

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${socket.userId})`);
    });
  });

  return io;
};

module.exports = configureSockets;
