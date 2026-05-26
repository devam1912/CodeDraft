const Tournament = require("../models/Tournament");
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

module.exports = {
  createTournament,
  registerForTournament,
  getTournament,
  getTournaments,
};
