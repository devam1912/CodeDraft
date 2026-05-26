const Tournament = require("../models/Tournament");
const Room = require("../models/Room");
const generateRoomId = require("../utils/generateRoomId");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const createTournament = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return sendError(res, 400, "Tournament name is required.");
    }

    const tournament = new Tournament({
      name,
      creatorId: req.userId,
      status: "draft",
      participants: [req.userId],
    });

    await tournament.save();
    logger.info(`Tournament created successfully: ${name} by ${req.userId}`);

    return sendSuccess(res, 201, tournament, "Tournament draft created successfully");
  } catch (error) {
    logger.error(`Error in createTournament: ${error.message}`);
    next(error);
  }
};

const registerForTournament = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return sendError(res, 404, "Tournament not found.");
    }

    if (tournament.status !== "draft") {
      return sendError(res, 400, "Tournament has already started or finished.");
    }

    const updatedTournament = await Tournament.findByIdAndUpdate(
      id,
      { $addToSet: { participants: req.userId } },
      { new: true }
    )
      .populate("creatorId", "username")
      .populate("participants", "username eloRating college avatar");

    logger.info(`User ${req.userId} registered for tournament ${id}`);
    return sendSuccess(res, 200, updatedTournament, "Registered for tournament successfully");
  } catch (error) {
    logger.error(`Error in registerForTournament: ${error.message}`);
    next(error);
  }
};

const getTournament = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id)
      .populate("creatorId", "username")
      .populate("participants", "username eloRating college avatar")
      .populate("rounds.matches.playerA", "username eloRating college avatar")
      .populate("rounds.matches.playerB", "username eloRating college avatar")
      .populate("rounds.matches.winnerId", "username eloRating college avatar");

    if (!tournament) {
      return sendError(res, 404, "Tournament not found.");
    }

    return sendSuccess(res, 200, tournament, "Tournament retrieved successfully");
  } catch (error) {
    logger.error(`Error in getTournament: ${error.message}`);
    next(error);
  }
};

const getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find()
      .populate("creatorId", "username")
      .sort({ createdAt: -1 })
      .lean();

    return sendSuccess(res, 200, tournaments, "Tournaments listed successfully");
  } catch (error) {
    logger.error(`Error in getTournaments: ${error.message}`);
    next(error);
  }
};

const startTournament = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return sendError(res, 404, "Tournament not found.");
    }

    if (tournament.creatorId.toString() !== req.userId.toString()) {
      return sendError(res, 403, "Only the tournament host can start it.");
    }

    if (tournament.status !== "draft") {
      return sendError(res, 400, "Tournament has already started.");
    }

    const players = tournament.participants;
    if (players.length < 2) {
      return sendError(res, 400, "A minimum of 2 participants is required to start.");
    }

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
          creatorId: req.userId,
          status: "waiting_for_players",
          setupExpiresAt,
          players: [playerA, playerB],
          battleFormat: "1v1",
          problem: {
            title: "Tournament Duel: CodeCraft Optimization",
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

    tournament.rounds = [{
      roundNumber: 1,
      matches,
    }];
    tournament.status = "active";
    await tournament.save();

    logger.info(`Tournament ${id} started with ${players.length} players.`);
    return sendSuccess(res, 200, tournament, "Tournament round 1 matchups generated successfully");
  } catch (error) {
    logger.error(`Error in startTournament: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createTournament,
  registerForTournament,
  getTournament,
  getTournaments,
  startTournament,
};
