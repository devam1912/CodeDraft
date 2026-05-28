const User = require("../models/User");
const Room = require("../models/Room");
const os = require("os");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const getTelemetry = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await Room.countDocuments();
    const activeRoomsCount = await Room.countDocuments({ status: "active" });

    const memory = process.memoryUsage();
    const sysMem = {
      free: os.freemem(),
      total: os.totalmem(),
    };

    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : "Intel CPU";

    const creatorsAudit = await Room.aggregate([
      { $group: { _id: "$creatorId", problemsCount: { $sum: 1 } } },
      { $sort: { problemsCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "creator" } },
      { $unwind: "$creator" },
      {
        $project: {
          username: "$creator.username",
          eloRating: "$creator.eloRating",
          college: "$creator.college",
          problemsCount: 1,
        }
      }
    ]);

    return sendSuccess(res, 200, {
      totalUsers,
      totalRooms,
      activeRoomsCount,
      cpu: {
        model: cpuModel,
        cores: cpus.length,
        loadAvg: os.loadavg(),
      },
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        freeSystem: Math.round(sysMem.free / 1024 / 1024),
        totalSystem: Math.round(sysMem.total / 1024 / 1024),
      },
      creatorsAudit,
    }, "Telemetry data retrieved successfully");
  } catch (error) {
    logger.error(`Error in getTelemetry: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getTelemetry,
};
