const cron = require("node-cron");
const Tournament = require("../models/Tournament");
const Room = require("../models/Room");
const generateRoomId = require("../utils/generateRoomId");
const logger = require("../utils/logger");

const initTournamentCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const drafts = await Tournament.find({
        status: "draft",
        participants: { $exists: true }
      });

      for (const t of drafts) {
        if (t.participants.length >= 8) {
          const players = t.participants;
          const shuffled = [...players].sort(() => Math.random() - 0.5);
          const matches = [];

          for (let i = 0; i < shuffled.length; i += 2) {
            const playerA = shuffled[i];
            const playerB = shuffled[i + 1];

            if (playerA && playerB) {
              const roomId = generateRoomId();
              const setupExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
              const room = new Room({
                roomId,
                creatorId: t.creatorId,
                status: "waiting_for_players",
                setupExpiresAt,
                players: [playerA, playerB],
                battleFormat: "1v1",
                problem: {
                  title: "Tournament Duel: Contiguous Subarray Max Sum",
                  statement: "Write a high-performance solution to calculate the maximum sum of contiguous subarrays. Standard input will read integers. Returns the maximum sum.",
                  difficulty: "medium",
                  timeLimit: 10,
                  allowedLanguages: ["javascript", "python", "cpp"],
                  visibleExamples: [
                    { input: "-2 1 -3 4 -1 2 1 -5 4", output: "6" }
                  ],
                  hiddenTestCases: [
                    { input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
                    { input: "1 2 3 4", expectedOutput: "10" },
                    { input: "-1 -2 -3 -4", expectedOutput: "-1" },
                    { input: "5 4 -1 7 8", expectedOutput: "23" }
                  ]
                }
              });
              await room.save();

              matches.push({
                roomId,
                playerA,
                playerB,
                winnerId: null,
              });
            } else if (playerA) {
              matches.push({
                roomId: "",
                playerA,
                playerB: null,
                winnerId: playerA,
              });
            }
          }

          t.rounds = [{
            roundNumber: 1,
            matches,
          }];
          t.status = "active";
          await t.save();

          logger.info(`Cron auto-started Tournament ${t._id} with ${players.length} players.`);
        }
      }
    } catch (error) {
      logger.error(`Error in tournament cron job: ${error.message}`);
    }
  });
};

module.exports = initTournamentCron;
