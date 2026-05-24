const Room = require("../models/Room");
const activeRooms = require("./roomManager");
const logger = require("../utils/logger");

const registerMatchHandlers = (io, socket) => {
  socket.on("room:join", async ({ roomId }) => {
    try {
      if (!roomId) {
        return socket.emit("error", { message: "Room ID is required" });
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit("error", { message: "Lobby not found" });
      }

      if (room.status === "expired" || (room.status === "setting_up" && room.setupExpiresAt <= new Date())) {
        if (room.status !== "expired") {
          room.status = "expired";
          await room.save();
        }
        return socket.emit("error", { message: "Room has expired" });
      }

      if (room.status === "finished") {
        return socket.emit("error", { message: "This battle has already finished" });
      }

      const maxPlayers = room.battleFormat === "2v2" ? 4 : 2;
      const isAlreadyJoined = room.players.some(
        (p) => p.toString() === socket.userId.toString()
      );

      if (!isAlreadyJoined && room.players.length >= maxPlayers) {
        return socket.emit("error", { message: "This room lobby is full" });
      }

      let updateQuery = { $addToSet: { players: socket.userId } };

      if (room.battleFormat === "2v2" && !isAlreadyJoined) {
        const teamASpace = 2 - room.teamA.length;
        if (teamASpace > 0) {
          updateQuery.$addToSet.teamA = socket.userId;
        } else {
          updateQuery.$addToSet.teamB = socket.userId;
        }
      }

      const updatedRoom = await Room.findOneAndUpdate(
        { roomId },
        updateQuery,
        { new: true }
      ).populate("players", "username eloRating college avatar");

      socket.roomId = roomId;
      socket.join(roomId);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          players: new Map(),
          spectators: new Set(),
          status: updatedRoom.status,
          matchWon: false,
          problem: updatedRoom.problem,
          submissions: new Map(),
        });
      }

      activeRooms.get(roomId).players.set(socket.userId.toString(), socket.id);

      const joinedPlayer = updatedRoom.players.find(
        (p) => p._id.toString() === socket.userId.toString()
      );

      io.to(roomId).emit("room:playerJoined", {
        player: joinedPlayer,
        currentPlayers: updatedRoom.players,
      });

      logger.info(`User ${socket.userId} joined Room ${roomId} via socket ${socket.id}`);
    } catch (error) {
      logger.error(`Error in socket room:join: ${error.message}`);
      socket.emit("error", { message: "Internal server socket error occurred" });
    }
  });

  socket.on("room:start", async ({ roomId }) => {
    try {
      if (!roomId) {
        return socket.emit("error", { message: "Room ID is required" });
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit("error", { message: "Room not found" });
      }

      if (room.creatorId.toString() !== socket.userId.toString()) {
        return socket.emit("error", { message: "Only the room host can launch the battle" });
      }

      if (room.status !== "waiting_for_players") {
        return socket.emit("error", { message: "Lobby is not ready to start" });
      }

      const maxPlayers = room.battleFormat === "2v2" ? 4 : 2;
      if (room.players.length < maxPlayers) {
        return socket.emit("error", { message: "Minimum competitors required to start the battle have not joined" });
      }

      if (!activeRooms.has(roomId)) {
        return socket.emit("error", { message: "Room active state not tracked" });
      }

      const roomState = activeRooms.get(roomId);
      roomState.status = "active";

      let count = 3;
      io.to(roomId).emit("room:countdown", { count });

      const countdownInterval = setInterval(async () => {
        count--;
        if (count > 0) {
          io.to(roomId).emit("room:countdown", { count });
        } else {
          clearInterval(countdownInterval);

          room.status = "active";
          room.startedAt = new Date();
          await room.save();

          io.to(roomId).emit("room:ready", {
            problem: {
              title: room.problem.title,
              statement: room.problem.statement,
              visibleExamples: room.problem.visibleExamples,
              timeLimit: room.problem.timeLimit,
              difficulty: room.problem.difficulty,
              allowedLanguages: room.problem.allowedLanguages,
            },
          });

          logger.info(`Synchronized countdown finished. Battle active for Room ${roomId}`);
        }
      }, 1000);
    } catch (error) {
      logger.error(`Error in socket room:start: ${error.message}`);
      socket.emit("error", { message: "Failed to start the battle arena" });
    }
  });

  socket.on("disconnect", () => {
    try {
      const { roomId, userId } = socket;
      if (roomId && activeRooms.has(roomId)) {
        const roomState = activeRooms.get(roomId);
        if (roomState.players.has(userId.toString())) {
          roomState.players.delete(userId.toString());
          logger.info(`User ${userId} left Room ${roomId} on socket disconnect`);
        }
      }
    } catch (error) {
      logger.error(`Error in socket disconnect handler: ${error.message}`);
    }
  });
};

module.exports = registerMatchHandlers;
