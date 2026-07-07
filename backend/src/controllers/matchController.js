const Room = require("../models/Room");
const { sendSuccess } = require("../utils/response");
const logger = require("../utils/logger");

const getMatchHistory = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const rooms = await Room.find({
      players: userId,
      status: "finished",
    })
      .populate("players", "username eloRating avatar")
      .populate("winnerId", "_id username")
      .select("roomId players winnerId eloChanges startedAt finishedAt problem battleFormat creatorCompeting")
      .sort({ finishedAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const total = await Room.countDocuments({ players: userId, status: "finished" });

    const history = rooms.map((room) => {
      const opponent = room.players.find((p) => p._id.toString() !== userId.toString());
      const winnerIdStr = room.winnerId?._id?.toString() || room.winnerId?.toString() || null;
      let result = "draw";
      if (winnerIdStr === userId.toString()) result = "win";
      else if (winnerIdStr && winnerIdStr !== userId.toString()) result = "loss";

      const eloChange = room.eloChanges?.[userId.toString()] ?? null;

      const durationMs = room.finishedAt && room.startedAt
        ? new Date(room.finishedAt) - new Date(room.startedAt)
        : null;
      const durationSec = durationMs ? Math.round(durationMs / 1000) : null;

      return {
        roomId: room.roomId,
        opponent: opponent ? { username: opponent.username, eloRating: opponent.eloRating, avatar: opponent.avatar } : null,
        result,
        eloChange,
        durationSec,
        problemTitle: room.problem?.title || null,
        difficulty: room.problem?.difficulty || null,
        finishedAt: room.finishedAt,
      };
    });

    return sendSuccess(
      res,
      200,
      {
        history,
        pagination: {
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(total / parsedLimit),
          total,
        },
      },
      "Match history retrieved successfully"
    );
  } catch (error) {
    logger.error(`Error in getMatchHistory: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getMatchHistory,
};
