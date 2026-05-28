const User = require("../models/User");
const Room = require("../models/Room");
const Notification = require("../models/Notification");
const generateRoomId = require("../utils/generateRoomId");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const getPublicProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username })
      .select("username eloRating wins losses draws matchesPlayed college avatar spectatorPredictions eloHistory createdAt")
      .lean();

    if (!user) {
      return sendError(res, 404, "User profile not found");
    }

    const globalRank = await User.countDocuments({ eloRating: { $gt: user.eloRating } });

    const recentProblems = await Room.find({
      creatorId: user._id,
      status: { $in: ["finished", "waiting_for_players", "active"] },
    })
      .select("roomId problem status finishedAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentMatches = await Room.find({
      players: user._id,
      status: "finished",
    })
      .populate("players", "username eloRating avatar")
      .populate("winnerId", "_id username")
      .select("roomId players winnerId eloChanges finishedAt startedAt problem")
      .sort({ finishedAt: -1 })
      .limit(5)
      .lean();

    const history = recentMatches.map((room) => {
      const opponent = room.players.find((p) => p._id.toString() !== user._id.toString());
      const winnerIdStr = room.winnerId?._id?.toString() || room.winnerId?.toString() || null;
      let result = "draw";
      if (winnerIdStr === user._id.toString()) result = "win";
      else if (winnerIdStr && winnerIdStr !== user._id.toString()) result = "loss";
      const eloChange = room.eloChanges?.[user._id.toString()] ?? null;
      const durationSec = room.finishedAt && room.startedAt
        ? Math.round((new Date(room.finishedAt) - new Date(room.startedAt)) / 1000)
        : null;
      return { roomId: room.roomId, opponent: opponent ? { username: opponent.username, eloRating: opponent.eloRating } : null, result, eloChange, durationSec, problemTitle: room.problem?.title || null };
    });

    const problems = recentProblems.map((r) => ({
      roomId: r.roomId,
      title: r.problem?.title || "Untitled",
      difficulty: r.problem?.difficulty || "medium",
      status: r.status,
    }));

    const recentEloHistory = (user.eloHistory || []).slice(-20);
    const winPct = user.wins + user.losses > 0
      ? Math.round((user.wins / (user.wins + user.losses)) * 100)
      : 0;

    return sendSuccess(
      res,
      200,
      {
        username: user.username,
        avatar: user.avatar,
        college: user.college,
        eloRating: user.eloRating,
        globalRank: globalRank + 1,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        matchesPlayed: user.matchesPlayed,
        winPct,
        spectatorPredictions: user.spectatorPredictions,
        eloHistory: recentEloHistory,
        recentMatches: history,
        recentProblems: problems,
        memberSince: user.createdAt,
      },
      "Public profile retrieved successfully"
    );
  } catch (error) {
    logger.error(`Error in getPublicProfile: ${error.message}`);
    next(error);
  }
};

const sendChallengeInvite = async (req, res, next) => {
  try {
    const { username } = req.params;
    const challengerId = req.userId;

    const challenger = await User.findById(challengerId).select("username avatar").lean();
    const challengee = await User.findOne({ username }).select("_id username").lean();

    if (!challengee) {
      return sendError(res, 404, "User to challenge not found");
    }

    if (challengerId.toString() === challengee._id.toString()) {
      return sendError(res, 400, "You cannot challenge yourself");
    }

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
      creatorId: challengerId,
      creatorCompeting: true,
      battleFormat: "1v1",
      isPublic: false,
      status: "setting_up",
      setupExpiresAt,
      players: [challengerId],
    });

    await room.save();

    const notification = new Notification({
      recipientId: challengee._id,
      senderId: challengerId,
      type: "challenge_invite",
      title: "⚔️ Direct Challenge!",
      message: `${challenger.username} has challenged you to a direct 1v1 battle! Click to accept and enter the lobby.`,
      payload: { roomId },
    });

    await notification.save();

    const io = req.app.get("io");
    if (io) {
      io.to(challengee._id.toString()).emit("notification:new", { notification });
    }

    logger.info(`Direct challenge sent from ${challenger.username} to ${challengee.username} - Room: ${roomId}`);

    return sendSuccess(
      res,
      201,
      { roomId },
      "Challenge invitation sent successfully"
    );
  } catch (error) {
    logger.error(`Error in sendChallengeInvite: ${error.message}`);
    next(error);
  }
};

module.exports = { getPublicProfile, sendChallengeInvite };
