const Room = require("../models/Room");
const Tournament = require("../models/Tournament");
const activeRooms = require("./roomManager");
const logger = require("../utils/logger");
const { executeJS } = require("../utils/codeExecutor");
const axios = require("axios");
const generateRoomId = require("../utils/generateRoomId");

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
};

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
          room.eventTimeline.push({
            eventType: "match_started",
            timestamp: new Date()
          });
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

  socket.on("battle:progress", async ({ roomId, passedCount, totalCount }) => {
    try {
      if (!roomId) return;
      socket.to(roomId).emit("battle:progress", {
        userId: socket.userId.toString(),
        passedCount,
        totalCount,
      });

      await Room.findOneAndUpdate(
        { roomId },
        {
          $push: {
            eventTimeline: {
              eventType: "progress_updated",
              userId: socket.userId,
              payload: { passedCount, totalCount },
              timestamp: new Date()
            }
          }
        }
      );
    } catch (error) {
      logger.error(`Error in socket battle:progress: ${error.message}`);
    }
  });

  socket.on("battle:keystroke", ({ roomId }) => {
    try {
      if (!roomId) return;
      socket.to(roomId).emit("battle:typing", {
        userId: socket.userId.toString(),
      });
    } catch (error) {
      logger.error(`Error in socket battle:keystroke: ${error.message}`);
    }
  });

  socket.on("spectator:voteCast", ({ roomId, coderId }) => {
    try {
      if (!roomId || !coderId) return;
      if (!activeRooms.has(roomId)) return;
      const roomState = activeRooms.get(roomId);
      if (!roomState.votes) {
        roomState.votes = {};
      }
      roomState.votes[socket.userId.toString()] = coderId.toString();

      const counts = {};
      let totalVotes = 0;
      Object.values(roomState.votes).forEach((cId) => {
        counts[cId] = (counts[cId] || 0) + 1;
        totalVotes++;
      });

      const percentages = {};
      Object.keys(counts).forEach((cId) => {
        percentages[cId] = Math.round((counts[cId] / totalVotes) * 100);
      });

      io.to(roomId).emit("spectator:voteUpdate", { percentages, totalVotes });
    } catch (error) {
      logger.error(`Error in socket spectator:voteCast: ${error.message}`);
    }
  });

  socket.on("battle:submit", async ({ roomId, sourceCode, language }) => {
    try {
      if (!roomId || !sourceCode || !language) {
        return socket.emit("error", { message: "Missing submission parameters" });
      }

      const room = await Room.findOne({ roomId })
        .populate("players", "username eloRating wins losses matchesPlayed");
      if (!room) {
        return socket.emit("error", { message: "Room not found" });
      }

      if (room.status !== "active") {
        return socket.emit("error", { message: "This battle arena is not active" });
      }

      const isCompetitor = room.players.some((p) => p._id.toString() === socket.userId.toString());
      if (!isCompetitor) {
        return socket.emit("error", { message: "You are not registered as a competitor in this match" });
      }

      const testCases = room.problem.hiddenTestCases;
      const results = [];
      let allPassed = true;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const input = tc.input;
        const expectedOutput = tc.expectedOutput.trim();

        if (language === "javascript") {
          const localResult = executeJS(sourceCode, input);
          const actualOutput = (localResult.output || "").trim();
          const passed = localResult.success && actualOutput === expectedOutput;
          if (!passed) allPassed = false;
          results.push({ passed });
        } else {
          const langId = LANGUAGE_IDS[language];
          if (!langId) {
            return socket.emit("error", { message: "Unsupported programming language" });
          }
          try {
            const response = await axios.post(
              `${process.env.JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
              {
                source_code: sourceCode,
                language_id: langId,
                stdin: input,
              },
              {
                headers: {
                  "x-rapidapi-key": process.env.JUDGE0_API_KEY,
                  "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
                  "Content-Type": "application/json",
                },
                timeout: Number(process.env.JUDGE0_TIMEOUT_MS) || 5000,
              }
            );
            const { stdout, status } = response.data;
            const actualOutput = (stdout || "").trim();
            const passed = status.id === 3 && actualOutput === expectedOutput;
            if (!passed) allPassed = false;
            results.push({ passed });
          } catch (apiError) {
            logger.error(`Judge0 API error during battle submit: ${apiError.message}`);
            if (language === "javascript") {
              const localResult = executeJS(sourceCode, input);
              const actualOutput = (localResult.output || "").trim();
              const passed = localResult.success && actualOutput === expectedOutput;
              if (!passed) allPassed = false;
              results.push({ passed });
            } else {
              allPassed = false;
              results.push({ passed: false });
            }
          }
        }
      }

      if (!allPassed) {
        await Room.findOneAndUpdate(
          { roomId },
          {
            $push: {
              eventTimeline: {
                eventType: "submission_attempt",
                userId: socket.userId,
                payload: { language, passed: false },
                timestamp: new Date()
              }
            }
          }
        );
        socket.emit("battle:submitResult", { success: false, results });
        return;
      }

      const winnerId = socket.userId;
      const opponentUser = room.players.find((p) => p._id.toString() !== winnerId.toString());
      let eloChanges = {};

      if (opponentUser) {
        const winnerUser = room.players.find((p) => p._id.toString() === winnerId.toString());
        const expectedA = 1 / (1 + Math.pow(10, (opponentUser.eloRating - winnerUser.eloRating) / 400));
        const K = 32;

        let winnerDelta = Math.round(K * (1 - expectedA));
        let loserDelta = Math.round(K * (0 - (1 - expectedA)));

        if (winnerId.toString() === room.creatorId.toString() && room.creatorCompeting) {
          winnerDelta = Math.max(0, winnerDelta - 5);
        }

        const newWinnerElo = winnerUser.eloRating + winnerDelta;
        const newLoserElo = Math.max(100, opponentUser.eloRating + loserDelta);

        winnerUser.eloRating = newWinnerElo;
        winnerUser.wins += 1;
        winnerUser.matchesPlayed += 1;
        await winnerUser.save();

        opponentUser.eloRating = newLoserElo;
        opponentUser.losses += 1;
        opponentUser.matchesPlayed += 1;
        await opponentUser.save();

        eloChanges[winnerId.toString()] = winnerDelta;
        eloChanges[opponentUser._id.toString()] = loserDelta;
      } else {
        const winnerUser = room.players.find((p) => p._id.toString() === winnerId.toString());
        winnerUser.wins += 1;
        winnerUser.matchesPlayed += 1;
        await winnerUser.save();
        eloChanges[winnerId.toString()] = 0;
      }

      room.status = "finished";
      room.finishedAt = new Date();
      room.winnerId = winnerId;
      room.eloChanges = eloChanges;
      room.eventTimeline.push({
        eventType: "submission_attempt",
        userId: socket.userId,
        payload: { language, passed: true },
        timestamp: new Date()
      });
      room.eventTimeline.push({
        eventType: "match_finished",
        userId: winnerId,
        payload: { eloChanges },
        timestamp: new Date()
      });
      await room.save();

      const tournament = await Tournament.findOne({ status: "active", "rounds.matches.roomId": roomId });
      if (tournament) {
        const currentRound = tournament.rounds[tournament.rounds.length - 1];
        const matchNode = currentRound.matches.find((m) => m.roomId === roomId);
        if (matchNode) {
          matchNode.winnerId = winnerId;
          await tournament.save();

          const allCompleted = currentRound.matches.every((m) => m.winnerId !== null);
          if (allCompleted) {
            const roundWinners = currentRound.matches.map((m) => m.winnerId);
            if (roundWinners.length <= 1) {
              tournament.status = "finished";
              await tournament.save();
              io.to(roomId).emit("tournament:finished", { tournamentId: tournament._id, winnerId });
            } else {
              const nextRoundMatches = [];
              for (let i = 0; i < roundWinners.length; i += 2) {
                const wA = roundWinners[i];
                const wB = roundWinners[i + 1];

                if (wA && wB) {
                  const newRoomId = generateRoomId();
                  const setupExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
                  const nextRoom = new Room({
                    roomId: newRoomId,
                    creatorId: tournament.creatorId,
                    status: "waiting_for_players",
                    setupExpiresAt,
                    players: [wA, wB],
                    battleFormat: "1v1",
                    problem: {
                      title: `Tournament Round ${tournament.rounds.length + 1} Duel`,
                      statement: "Design a high-performance algorithm to calculate the nth Fibonacci number modulo 10^9 + 7.",
                      difficulty: "hard",
                      timeLimit: 15,
                      allowedLanguages: ["javascript", "python", "cpp"],
                      visibleExamples: [
                        { input: "5", output: "5" }
                      ],
                      hiddenTestCases: [
                        { input: "5", expectedOutput: "5" },
                        { input: "10", expectedOutput: "55" },
                        { input: "50", expectedOutput: "586268941" },
                        { input: "100", expectedOutput: "35022162" }
                      ]
                    }
                  });
                  await nextRoom.save();

                  nextRoundMatches.push({
                    roomId: newRoomId,
                    playerA: wA,
                    playerB: wB,
                    winnerId: null,
                  });
                } else if (wA) {
                  nextRoundMatches.push({
                    roomId: "",
                    playerA: wA,
                    playerB: null,
                    winnerId: wA,
                  });
                }
              }

              tournament.rounds.push({
                roundNumber: tournament.rounds.length + 1,
                matches: nextRoundMatches,
              });
              await tournament.save();
              io.to(roomId).emit("tournament:roundCompleted", { tournamentId: tournament._id });
            }
          }
        }
      }

      io.to(roomId).emit("battle:finished", {
        winnerId: winnerId.toString(),
        eloChanges,
      });

      logger.info(`Battle Arena roomId ${roomId} finished. Winner: ${winnerId}`);
    } catch (error) {
      logger.error(`Error in socket battle:submit: ${error.message}`);
      socket.emit("error", { message: "Internal submission compiler error occurred" });
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
