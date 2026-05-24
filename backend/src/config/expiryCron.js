const cron = require("node-cron");
const Room = require("../models/Room");
const logger = require("../utils/logger");

const initExpiryCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const result = await Room.updateMany(
        {
          status: "setting_up",
          setupExpiresAt: { $lte: now }
        },
        {
          $set: { status: "expired" }
        }
      );
      if (result.modifiedCount > 0) {
        logger.info(`Expired ${result.modifiedCount} room(s) that were still setting up.`);
      }
    } catch (error) {
      logger.error(`Error in expiry cron job: ${error.message}`);
    }
  });
};

module.exports = initExpiryCron;
