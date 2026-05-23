const Room = require("../models/Room");
const generateRoomId = require("../utils/generateRoomId");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const createRoom = async (req, res, next) => {
  try {
    const { battleFormat, creatorCompeting } = req.body;

    if (!battleFormat || !["1v1", "2v2"].includes(battleFormat)) {
      return sendError(res, 400, "Invalid battle format. Must be 1v1 or 2v2.");
    }

    const isCompeting = creatorCompeting === true;
    let roomId = "";
    let roomExists = true;

    while (roomExists) {
      roomId = generateRoomId();
      const existingRoom = await Room.findOne({ roomId }).lean();
      if (!existingRoom) {
        roomExists = false;
      }
    }

    const setupExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const room = new Room({
      roomId,
      creatorId: req.userId,
      status: "setting_up",
      setupExpiresAt,
    });

    if (creatorCompeting !== undefined) {
      room.creatorCompeting = isCompeting;
    }
    if (battleFormat !== undefined) {
      room.battleFormat = battleFormat;
    }

    await room.save();

    logger.info(`Room created successfully: ${roomId} by user ${req.userId}`);

    return sendSuccess(
      res,
      201,
      {
        roomId: room.roomId,
        creatorId: room.creatorId,
        status: room.status,
        setupExpiresAt: room.setupExpiresAt,
      },
      "Room created successfully"
    );
  } catch (error) {
    logger.error(`Error in createRoom: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createRoom,
};
