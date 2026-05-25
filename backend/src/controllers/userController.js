const User = require("../models/User");
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
      .select("username eloRating wins losses college avatar")
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

module.exports = {
  getLeaderboard,
};
