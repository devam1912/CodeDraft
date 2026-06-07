const cron = require("node-cron");
const Room = require("../models/Room");
const logger = require("../utils/logger");

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

const initExpiryCron = (io) => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // 1. Auto-start rooms in lobby where setup time expired (TDM framing timer)
      const waitingRooms = await Room.find({
        status: "waiting_for_players",
        setupExpiresAt: { $lte: now }
      });

      for (const room of waitingRooms) {
        try {
          const defaultProb = FALLBACK_CHALLENGES[room.difficulty || "easy"] || FALLBACK_CHALLENGES.easy;
          if (!room.problemA) room.problemA = defaultProb;
          if (!room.problemB) room.problemB = defaultProb;

          if (!room.problem) {
            room.problem = room.problemA;
          }

          room.status = "active";
          room.startedAt = now;
          room.eventTimeline.push({
            eventType: "match_started_auto",
            timestamp: now
          });
          await room.save();

          logger.info(`Auto-launched battle room ${room.roomId} due to framing countdown expiry.`);

          if (io) {
            // Emit customized room:ready to each player socket based on their team swap
            const socketsInRoom = await io.in(room.roomId).fetchSockets();
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
              message: `Battle Room ${room.roomId} has auto-launched! The race to pass custom-framed test cases is ON!`,
              timestamp: new Date(),
            });
          }
        } catch (roomError) {
          logger.error(`Error auto-starting expired lobby room ${room.roomId}: ${roomError.message}`);
        }
      }

      // 2. Clear out unused and expired setup rooms (for older sessions)
      const expiredSetupResult = await Room.updateMany(
        {
          status: "setting_up",
          setupExpiresAt: { $lte: now }
        },
        {
          $set: { status: "expired" }
        }
      );

      if (expiredSetupResult.modifiedCount > 0) {
        logger.info(`Expired ${expiredSetupResult.modifiedCount} unused room(s) that were still in setup status.`);
      }
    } catch (error) {
      logger.error(`Error in expiry cron job: ${error.message}`);
    }
  });
};

module.exports = initExpiryCron;
