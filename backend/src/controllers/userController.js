const User = require("../models/User");
const Room = require("../models/Room");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const getLeaderboard = async (req, res, next) => {
  try {
    const { college, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (college) {
      query.college = new RegExp("^" + college.trim() + "$", "i");
    }

    if (search) {
      query.username = { $regex: search.trim(), $options: "i" };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const users = await User.find(query)
      .select("username eloRating wins losses draws matchesPlayed college avatar")
      .sort({ eloRating: -1, wins: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const totalUsers = await User.countDocuments(query);

    return sendSuccess(
      res,
      200,
      {
        users,
        pagination: {
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(totalUsers / parsedLimit),
          totalUsers,
        },
      },
      "Leaderboard retrieved successfully"
    );
  } catch (error) {
    logger.error(`Error in getLeaderboard: ${error.message}`);
    next(error);
  }
};

const getCollegeLeaderboard = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const results = await User.aggregate([
      { $match: { college: { $exists: true, $ne: "" } } },
      { $sort: { eloRating: -1 } },
      {
        $group: {
          _id: "$college",
          avgElo: { $avg: "$eloRating" },
          memberCount: { $sum: 1 },
          topElo: { $max: "$eloRating" },
        },
      },
      { $sort: { avgElo: -1 } },
      { $skip: skip },
      { $limit: parsedLimit },
    ]);

    const colleges = results.map((r) => ({
      college: r._id,
      avgElo: Math.round(r.avgElo),
      memberCount: r.memberCount,
      topElo: r.topElo,
    }));

    return sendSuccess(res, 200, { colleges }, "College leaderboard retrieved successfully");
  } catch (error) {
    logger.error(`Error in getCollegeLeaderboard: ${error.message}`);
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .select("username email eloRating wins losses draws matchesPlayed college avatar spectatorPredictions eloHistory createdAt")
      .lean();

    if (!user) {
      return sendError(res, 404, "User profile not found");
    }

    const globalRank = await User.countDocuments({ eloRating: { $gt: user.eloRating } });

    const recentEloHistory = (user.eloHistory || []).slice(-20);

    return sendSuccess(
      res,
      200,
      {
        ...user,
        eloHistory: recentEloHistory,
        globalRank: globalRank + 1,
      },
      "User profile retrieved successfully"
    );
  } catch (error) {
    logger.error(`Error in getProfile: ${error.message}`);
    next(error);
  }
};

const getProblemsCreated = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const rooms = await Room.find({
      creatorId: userId,
      status: { $in: ["finished", "waiting_for_players", "active"] },
    })
      .select("roomId problem status players finishedAt startedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const total = await Room.countDocuments({
      creatorId: userId,
      status: { $in: ["finished", "waiting_for_players", "active"] },
    });

    const problems = rooms.map((room) => ({
      roomId: room.roomId,
      title: room.problem?.title || "Untitled Problem",
      difficulty: room.problem?.difficulty || "medium",
      allowedLanguages: room.problem?.allowedLanguages || [],
      battlesPlayed: room.status === "finished" ? 1 : 0,
      status: room.status,
      finishedAt: room.finishedAt,
    }));

    return sendSuccess(
      res,
      200,
      {
        problems,
        pagination: {
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(total / parsedLimit),
          total,
        },
      },
      "Problems created retrieved successfully"
    );
  } catch (error) {
    logger.error(`Error in getProblemsCreated: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getLeaderboard,
  getCollegeLeaderboard,
  getProfile,
  getProblemsCreated,
};
