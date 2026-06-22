const Room = require("../models/Room");
const Tournament = require("../models/Tournament");
const Notification = require("../models/Notification");
const activeRooms = require("./roomManager");
const logger = require("../utils/logger");
const { executeJS, executePython, executeCPP, executeC } = require("../utils/codeExecutor");
const axios = require("axios");
const generateRoomId = require("../utils/generateRoomId");

const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
  go: 60,
  rust: 73,
  c: 50,
};

const FALLBACK_CHALLENGES = {
  easy: {
    title: "Two Sum",
    statement: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    visibleExamples: [
      { input: "[2,7,11,15]\n9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }
    ],
    hiddenTestCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]" },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]" },
      { input: "[3,3]\n6", expectedOutput: "[0,1]" },
      { input: "[1,5,3,7]\n12", expectedOutput: "[1,3]" }
    ],
    timeLimit: 10,
    difficulty: "easy",
    allowedLanguages: ["javascript", "python", "cpp"]
  },
  medium: {
    title: "Reverse Integer",
    statement: "Given a signed 32-bit integer x, return x with its digits reversed. If reversing x causes the value to go outside the signed 32-bit integer range [-2^31, 2^31 - 1], then return 0.",
    visibleExamples: [
      { input: "123", output: "321", explanation: "123 reversed is 321." }
    ],
    hiddenTestCases: [
      { input: "123", expectedOutput: "321" },
      { input: "-123", expectedOutput: "-321" },
      { input: "120", expectedOutput: "21" },
      { input: "1534236469", expectedOutput: "0" }
    ],
    timeLimit: 10,
    difficulty: "medium",
    allowedLanguages: ["javascript", "python", "cpp"]
  },
  hard: {
    title: "Regular Expression Matching",
    statement: "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where '.' matches any single character and '*' matches zero or more of the preceding element.",
    visibleExamples: [
      { input: "aa\na", output: "false", explanation: "'a' does not match the entire string 'aa'." }
    ],
    hiddenTestCases: [
      { input: "aa\na", expectedOutput: "false" },
      { input: "aa\na*", expectedOutput: "true" },
      { input: "ab\n.*", expectedOutput: "true" },
      { input: "aab\nc*a*b", expectedOutput: "true" }
    ],
    timeLimit: 15,
    difficulty: "hard",
    allowedLanguages: ["javascript", "python", "cpp"]
  }
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

      if (room.status === "active") {
        const isCompetitor = room.players.some((p) => p.toString() === socket.userId.toString());
        if (!isCompetitor) {
          return socket.emit("error", { message: "You are not a registered participant in this active match." });
        }
      }

      const maxPlayers = room.battleFormat === "2v2" ? 4 : 2;
      const isAlreadyJoined = room.players.some(
        (p) => p.toString() === socket.userId.toString()
      );

      if (!isAlreadyJoined && room.players.length >= maxPlayers) {
        return socket.emit("error", { message: "This room lobby is full" });
      }

      let updateQuery = { $addToSet: { players: socket.userId } };

      if (!isAlreadyJoined) {
        if (room.battleFormat === "2v2") {
          const teamASpace = 2 - room.teamA.length;
          if (teamASpace > 0) {
            updateQuery.$addToSet.teamA = socket.userId;
          } else {
            updateQuery.$addToSet.teamB = socket.userId;
          }
        } else {
          if (socket.userId.toString() === room.creatorId.toString()) {
            updateQuery.$addToSet.teamA = socket.userId;
          } else {
            updateQuery.$addToSet.teamB = socket.userId;
          }
        }
      }

      const updatedRoom = await Room.findOneAndUpdate(
        { roomId },
        updateQuery,
        { new: true }
      )
        .populate("players", "username eloRating college avatar")
        .populate("teamA", "username eloRating college avatar")
        .populate("teamB", "username eloRating college avatar");

      const isLobbyFull = updatedRoom.players.length >= maxPlayers;

      let timerStarted = false;
      if (isLobbyFull && !updatedRoom.setupExpiresAt && updatedRoom.status === "waiting_for_players") {
        const setupDuration = updatedRoom.isBlitz === true ? 5 * 60 * 1000 : 30 * 60 * 1000;
        const setupExpiresAt = new Date(Date.now() + setupDuration);
        
        await Room.updateOne({ roomId }, { setupExpiresAt });
        updatedRoom.setupExpiresAt = setupExpiresAt;
        timerStarted = true;
        
        logger.info(`Lobby full. Custom framing countdown initialized for Room ${roomId}`);
      }

      socket.roomId = roomId;
      socket.join(roomId);

      if (timerStarted) {
        io.to(roomId).emit("room:timerStarted", { setupExpiresAt: updatedRoom.setupExpiresAt });
      }

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, {
          players: new Map(),
          spectators: new Set(),
          status: updatedRoom.status,
          matchWon: false,
          problemA: updatedRoom.problemA,
          problemB: updatedRoom.problemB,
          problem: updatedRoom.problem,
          submissions: new Map(),
          playerCodes: new Map(),
        });
      }

      const roomState = activeRooms.get(roomId);
      roomState.players.set(socket.userId.toString(), socket.id);

      if (updatedRoom.status === "active") {
        const savedCode = roomState.playerCodes?.get(socket.userId.toString());
        if (savedCode) {
          socket.emit("battle:restoreCode", { savedCode });
        }
      }

      const joinedPlayer = updatedRoom.players.find(
        (p) => p._id.toString() === socket.userId.toString()
      );

      io.to(roomId).emit("room:playerJoined", {
        player: joinedPlayer,
        currentPlayers: updatedRoom.players,
        teamA: updatedRoom.teamA,
        teamB: updatedRoom.teamB,
      });

      io.emit("global:activity", {
        type: "join",
        message: `${joinedPlayer?.username || "A challenger"} entered Battle Lobby ${roomId}`,
        timestamp: new Date(),
      });

      logger.info(`User ${socket.userId} joined Room ${roomId} via socket ${socket.id}`);
    } catch (error) {
      logger.error(`Error in socket room:join: ${error.message}`);
      socket.emit("error", { message: "Internal server socket error occurred" });
    }
  });

  socket.on("room:switchTeam", async ({ roomId, targetTeam }) => {
    try {
      if (!roomId || !["A", "B"].includes(targetTeam)) {
        return socket.emit("error", { message: "Invalid parameters" });
      }
      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit("error", { message: "Room not found" });
      }
      if (room.status !== "setting_up" && room.status !== "waiting_for_players") {
        return socket.emit("error", { message: "Cannot switch teams now" });
      }
      const userIdStr = socket.userId.toString();
      const inTeamA = room.teamA.some((id) => id.toString() === userIdStr);
      const inTeamB = room.teamB.some((id) => id.toString() === userIdStr);
      if (targetTeam === "A" && inTeamA) return;
      if (targetTeam === "B" && inTeamB) return;

      if (targetTeam === "A") {
        if (room.teamA.length >= 2) {
          return socket.emit("error", { message: "Team Alpha is already full" });
        }
        room.teamB = room.teamB.filter((id) => id.toString() !== userIdStr);
        room.teamA.push(socket.userId);
      } else {
        if (room.teamB.length >= 2) {
          return socket.emit("error", { message: "Team Beta is already full" });
        }
        room.teamA = room.teamA.filter((id) => id.toString() !== userIdStr);
        room.teamB.push(socket.userId);
      }
      await room.save();
      const updatedRoom = await Room.findOne({ roomId })
        .populate("players", "username eloRating college avatar")
        .populate("teamA", "username eloRating college avatar")
        .populate("teamB", "username eloRating college avatar");

      io.to(roomId).emit("room:teamUpdated", {
        teamA: updatedRoom.teamA,
        teamB: updatedRoom.teamB,
        players: updatedRoom.players,
      });
    } catch (error) {
      logger.error(`Error in socket room:switchTeam: ${error.message}`);
      socket.emit("error", { message: "Failed to switch teams" });
    }
  });

  socket.on("room:start", async ({ roomId, force }) => {
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

      const isExpired = room.setupExpiresAt <= new Date();
      const forceStart = force === true || isExpired;

      if (!room.problemA || !room.problemB) {
        if (forceStart) {
          const defaultProb = FALLBACK_CHALLENGES[room.difficulty || "easy"] || FALLBACK_CHALLENGES.easy;
          if (!room.problemA) room.problemA = defaultProb;
          if (!room.problemB) room.problemB = defaultProb;
          await room.save();
        } else {
          return socket.emit("error", { message: "Both participants must frame their challenges before starting the battle." });
        }
      }

      const roomState = activeRooms.get(roomId);
      roomState.status = "active";
      roomState.problemA = room.problemA;
      roomState.problemB = room.problemB;

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

          // Emit customized room:ready to each player socket based on their team swap
          const socketsInRoom = await io.in(roomId).fetchSockets();
          for (const s of socketsInRoom) {
            const isTeamA = room.teamA.some(p => p.toString() === s.userId?.toString());
            const targetProblem = isTeamA ? room.problemB : room.problemA;

            s.emit("room:ready", {
              problem: {
                title: targetProblem.title,
                statement: targetProblem.statement,
                visibleExamples: targetProblem.visibleExamples,
                timeLimit: targetProblem.timeLimit,
                difficulty: targetProblem.difficulty,
                allowedLanguages: targetProblem.allowedLanguages,
              }
            });
          }

          io.emit("global:activity", {
            type: "battle_start",
            message: `Battle Room ${roomId} has launched! The race to pass custom-framed test cases is ON!`,
            timestamp: new Date(),
          });

          logger.info(`Synchronized countdown finished. Swapped Battle active for Room ${roomId}`);
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

  socket.on("battle:keystroke", async ({ roomId, lineCount }) => {
    try {
      if (!roomId) return;
      socket.to(roomId).emit("battle:typing", {
        userId: socket.userId.toString(),
      });

      if (typeof lineCount === "number") {
        await Room.findOneAndUpdate(
          { roomId },
          {
            $push: {
              eventTimeline: {
                eventType: "line_count_updated",
                userId: socket.userId,
                payload: { lineCount },
                timestamp: new Date(),
              },
            },
          }
        );
      }
    } catch (error) {
      logger.error(`Error in socket battle:keystroke: ${error.message}`);
    }
  });

  socket.on("battle:codeUpdate", async ({ roomId, sourceCode }) => {
    try {
      if (!roomId || typeof sourceCode !== "string") return;
      if (!activeRooms.has(roomId)) return;
      const roomState = activeRooms.get(roomId);
      
      // Persist the code in-memory on the server
      if (!roomState.playerCodes) {
        roomState.playerCodes = new Map();
      }
      roomState.playerCodes.set(socket.userId.toString(), sourceCode);

      const room = await Room.findOne({ roomId });
      if (!room || room.status !== "active") return;
      const userIdStr = socket.userId.toString();
      const inTeamA = room.teamA.some((id) => id.toString() === userIdStr);
      const inTeamB = room.teamB.some((id) => id.toString() === userIdStr);
      let teammateId = null;

      if (inTeamA) {
        teammateId = room.teamA.find((id) => id.toString() !== userIdStr);
      } else if (inTeamB) {
        teammateId = room.teamB.find((id) => id.toString() !== userIdStr);
      }

      if (teammateId) {
        const teammateSocketId = roomState.players.get(teammateId.toString());
        if (teammateSocketId) {
          io.to(teammateSocketId).emit("battle:codeSync", {
            sourceCode,
            senderId: userIdStr,
          });
        }
      }
    } catch (error) {
      logger.error(`Error in socket battle:codeUpdate: ${error.message}`);
    }
  });

  socket.on("battle:submit", async ({ roomId, sourceCode, language }) => {
    try {
      if (!roomId || !sourceCode || !language) {
        return socket.emit("error", { message: "Missing submission parameters" });
      }

      const room = await Room.findOne({ roomId })
        .populate("players", "username eloRating wins losses matchesPlayed")
        .populate("teamA", "username eloRating wins losses matchesPlayed eloHistory")
        .populate("teamB", "username eloRating wins losses matchesPlayed eloHistory");
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

      const isTeamA = room.teamA.some((p) => p._id.toString() === socket.userId.toString());
      const targetProblem = isTeamA ? room.problemB : room.problemA;
      const testCases = targetProblem.hiddenTestCases;
      const results = [];
      let allPassed = true;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const input = tc.input;
        const expectedOutput = tc.expectedOutput.trim();

        if (language === "javascript") {
          const localResult = await executeJS(sourceCode, input);
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
                timeout: Number(process.env.JUDGE0_TIMEOUT_MS) || 15000,
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
              const localResult = await executeJS(sourceCode, input);
              const actualOutput = (localResult.output || "").trim();
              const passed = localResult.success && actualOutput === expectedOutput;
              if (!passed) allPassed = false;
              results.push({ passed });
            } else if (language === "python") {
              const localResult = await executePython(sourceCode, input);
              const actualOutput = (localResult.output || "").trim();
              const passed = localResult.success && actualOutput === expectedOutput;
              if (!passed) allPassed = false;
              results.push({ passed });
            } else if (language === "cpp") {
              const localResult = await executeCPP(sourceCode, input);
              const actualOutput = (localResult.output || "").trim();
              const passed = localResult.success && actualOutput === expectedOutput;
              if (!passed) allPassed = false;
              results.push({ passed });
            } else if (language === "c") {
              const localResult = await executeC(sourceCode, input);
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
      let eloChanges = {};

      if (room.battleFormat === "2v2") {
        const winningTeam = room.teamA.some((p) => p._id.toString() === winnerId.toString()) ? "A" : "B";
        room.winningTeam = winningTeam;

        const avgA = room.teamA.reduce((sum, p) => sum + p.eloRating, 0) / room.teamA.length;
        const avgB = room.teamB.reduce((sum, p) => sum + p.eloRating, 0) / room.teamB.length;

        const avgWinners = winningTeam === "A" ? avgA : avgB;
        const avgLosers = winningTeam === "A" ? avgB : avgA;

        const expectedWinners = 1 / (1 + Math.pow(10, (avgLosers - avgWinners) / 400));
        const K = 32;
        let winnerDelta = Math.round(K * (1 - expectedWinners));
        let loserDelta = Math.round(K * (0 - (1 - expectedWinners)));

        const winners = winningTeam === "A" ? room.teamA : room.teamB;
        const losers = winningTeam === "A" ? room.teamB : room.teamA;

        for (const p of winners) {
          let delta = winnerDelta;
          if (p._id.toString() === room.creatorId.toString() && room.creatorCompeting) {
            delta = Math.max(0, delta - 5);
          }
          p.eloRating += delta;
          p.wins += 1;
          p.matchesPlayed += 1;
          p.eloHistory = p.eloHistory || [];
          p.eloHistory.push({ eloRating: p.eloRating, roomId, createdAt: new Date() });
          if (p.eloHistory.length > 50) p.eloHistory = p.eloHistory.slice(-50);
          await p.save();
          eloChanges[p._id.toString()] = delta;
        }

        for (const p of losers) {
          const newElo = Math.max(100, p.eloRating + loserDelta);
          const delta = newElo - p.eloRating;
          p.eloRating = newElo;
          p.losses += 1;
          p.matchesPlayed += 1;
          p.eloHistory = p.eloHistory || [];
          p.eloHistory.push({ eloRating: newElo, roomId, createdAt: new Date() });
          if (p.eloHistory.length > 50) p.eloHistory = p.eloHistory.slice(-50);
          await p.save();
          eloChanges[p._id.toString()] = delta;
        }
      } else {
        const opponentUser = room.players.find((p) => p._id.toString() !== winnerId.toString());
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
          winnerUser.eloHistory = winnerUser.eloHistory || [];
          winnerUser.eloHistory.push({ eloRating: newWinnerElo, roomId, createdAt: new Date() });
          if (winnerUser.eloHistory.length > 50) winnerUser.eloHistory = winnerUser.eloHistory.slice(-50);
          await winnerUser.save();

          opponentUser.eloRating = newLoserElo;
          opponentUser.losses += 1;
          opponentUser.matchesPlayed += 1;
          opponentUser.eloHistory = opponentUser.eloHistory || [];
          opponentUser.eloHistory.push({ eloRating: newLoserElo, roomId, createdAt: new Date() });
          if (opponentUser.eloHistory.length > 50) opponentUser.eloHistory = opponentUser.eloHistory.slice(-50);
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

      const winnerUser = room.players.find((p) => p._id.toString() === winnerId.toString());
      const winDelta = eloChanges[winnerId.toString()] || 0;
      io.emit("global:activity", {
        type: "battle_finish",
        message: `${winnerUser?.username || "A challenger"} won the battle in Room ${roomId} (${winDelta >= 0 ? "+" : ""}${winDelta} ELO)`,
        timestamp: new Date(),
      });

      try {
        if (room.battleFormat === "2v2") {
          const winningTeam = room.winningTeam;
          const winners = winningTeam === "A" ? room.teamA : room.teamB;
          const losers = winningTeam === "A" ? room.teamB : room.teamA;

          for (const w of winners) {
            const wDelta = eloChanges[w._id.toString()] || 0;
            const winNotif = new Notification({
              recipientId: w._id,
              senderId: winnerId,
              type: "match_result",
              title: "Victory!",
              message: `Your team won the 2v2 battle! Gained ${wDelta >= 0 ? "+" : ""}${wDelta} ELO`,
              payload: { roomId, result: "win", eloChange: wDelta },
            });
            await winNotif.save();

            const winnerSocketId = activeRooms.get(roomId)?.players?.get(w._id.toString());
            if (winnerSocketId) {
              io.to(winnerSocketId).emit("notification:new", { notification: winNotif });
            }
          }

          for (const l of losers) {
            const lDelta = eloChanges[l._id.toString()] || 0;
            const loseNotif = new Notification({
              recipientId: l._id,
              senderId: winnerId,
              type: "match_result",
              title: "Defeat",
              message: `Your team lost the 2v2 battle. ${lDelta} ELO`,
              payload: { roomId, result: "loss", eloChange: lDelta },
            });
            await loseNotif.save();

            const loserSocketId = activeRooms.get(roomId)?.players?.get(l._id.toString());
            if (loserSocketId) {
              io.to(loserSocketId).emit("notification:new", { notification: loseNotif });
            }
          }
        } else {
          const winnerUser = room.players.find((p) => p._id.toString() === winnerId.toString());
          const loserUser = room.players.find((p) => p._id.toString() !== winnerId.toString());
          const winDelta = eloChanges[winnerId.toString()] || 0;
          const loseDelta = loserUser ? eloChanges[loserUser._id.toString()] || 0 : 0;

          const winNotif = new Notification({
            recipientId: winnerId,
            senderId: loserUser?._id || null,
            type: "match_result",
            title: "Victory!",
            message: `You defeated ${loserUser?.username || "your opponent"} and gained ${winDelta >= 0 ? "+" : ""}${winDelta} ELO`,
            payload: { roomId, result: "win", eloChange: winDelta },
          });
          await winNotif.save();

          const winnerSocketId = activeRooms.get(roomId)?.players?.get(winnerId.toString());
          if (winnerSocketId) {
            io.to(winnerSocketId).emit("notification:new", { notification: winNotif });
          }

          if (loserUser) {
            const loseNotif = new Notification({
              recipientId: loserUser._id,
              senderId: winnerId,
              type: "match_result",
              title: "Defeat",
              message: `${winnerUser?.username || "Your opponent"} solved it first. ${loseDelta} ELO`,
              payload: { roomId, result: "loss", eloChange: loseDelta },
            });
            await loseNotif.save();

            const loserSocketId = activeRooms.get(roomId)?.players?.get(loserUser._id.toString());
            if (loserSocketId) {
              io.to(loserSocketId).emit("notification:new", { notification: loseNotif });
            }
          }
        }
      } catch (notifError) {
        logger.error(`Failed to create match result notifications: ${notifError.message}`);
      }

      logger.info(`Battle Arena roomId ${roomId} finished. Winner: ${winnerId}`);
    } catch (error) {
      logger.error(`Error in socket battle:submit: ${error.message}`);
      socket.emit("error", { message: "Internal submission compiler error occurred" });
    }
  });

  socket.on("room:selectLanguage", async ({ roomId, language }) => {
    try {
      if (!roomId || !language) return;
      const room = await Room.findOne({ roomId });
      if (!room) return;

      if (!room.playerLanguages) {
        room.playerLanguages = new Map();
      }
      room.playerLanguages.set(socket.userId.toString(), language);
      await room.save();

      io.to(roomId).emit("room:languageUpdated", {
        userId: socket.userId.toString(),
        language,
        playerLanguages: Object.fromEntries(room.playerLanguages),
      });

      logger.info(`User ${socket.userId} selected language ${language} in room ${roomId}`);
    } catch (err) {
      logger.error(`Error in socket room:selectLanguage: ${err.message}`);
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
