const User = require("../models/User");
const Room = require("../models/Room");
const Notification = require("../models/Notification");
const generateRoomId = require("../utils/generateRoomId");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

// ─── Update own profile ─────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { college, degree, year, bio } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return sendError(res, 404, "User not found.");

    if (college !== undefined) user.college = college.trim();
    if (degree !== undefined) user.degree = degree.trim();
    if (year !== undefined) user.year = year.trim();
    if (bio !== undefined) user.bio = bio.slice(0, 200).trim();

    await user.save();
    logger.info(`User ${req.userId} updated profile`);
    return sendSuccess(res, 200, {
      college: user.college,
      degree: user.degree,
      year: user.year,
      bio: user.bio,
    }, "Profile updated successfully.");
  } catch (error) {
    logger.error(`Error in updateProfile: ${error.message}`);
    next(error);
  }
};

// ─── Send friend request ─────────────────────────────────────────────────────
const sendFriendRequest = async (req, res, next) => {
  try {
    const { username } = req.params;
    const senderId = req.userId;

    const target = await User.findOne({ username });
    if (!target) return sendError(res, 404, "User not found.");
    if (target._id.toString() === senderId.toString())
      return sendError(res, 400, "You cannot add yourself.");

    const sender = await User.findById(senderId);
    if (!sender) return sendError(res, 404, "Sender not found.");

    // Already friends?
    if (target.friends.map(String).includes(senderId.toString()))
      return sendError(res, 400, "Already friends.");

    // Already sent a request?
    const existingReq = target.friendRequests.find(
      (r) => r.from.toString() === senderId.toString() && r.status === "pending"
    );
    if (existingReq) return sendError(res, 400, "Friend request already sent.");

    target.friendRequests.push({ from: senderId, status: "pending" });
    await target.save();

    // Send notification
    await Notification.create({
      recipientId: target._id,
      type: "friend_request",
      title: "Friend Request",
      message: `${sender.username} sent you a friend request.`,
      payload: { fromUsername: sender.username, fromUserId: senderId },
    });

    return sendSuccess(res, 200, {}, "Friend request sent.");
  } catch (error) {
    logger.error(`Error in sendFriendRequest: ${error.message}`);
    next(error);
  }
};

// ─── Accept friend request ────────────────────────────────────────────────────
const acceptFriendRequest = async (req, res, next) => {
  try {
    const { username } = req.params;
    const userId = req.userId;

    const requester = await User.findOne({ username });
    if (!requester) return sendError(res, 404, "User not found.");

    const me = await User.findById(userId);
    if (!me) return sendError(res, 404, "User not found.");

    const reqIdx = me.friendRequests.findIndex(
      (r) => r.from.toString() === requester._id.toString() && r.status === "pending"
    );
    if (reqIdx === -1) return sendError(res, 404, "No pending friend request from this user.");

    me.friendRequests[reqIdx].status = "accepted";
    if (!me.friends.map(String).includes(requester._id.toString())) {
      me.friends.push(requester._id);
    }
    if (!requester.friends.map(String).includes(userId.toString())) {
      requester.friends.push(userId);
    }

    await me.save();
    await requester.save();

    // Notify requester
    await Notification.create({
      recipientId: requester._id,
      type: "friend_accepted",
      title: "Friend Request Accepted",
      message: `${me.username} accepted your friend request.`,
      payload: { fromUsername: me.username },
    });

    return sendSuccess(res, 200, {}, "Friend request accepted.");
  } catch (error) {
    logger.error(`Error in acceptFriendRequest: ${error.message}`);
    next(error);
  }
};

// ─── Reject friend request ────────────────────────────────────────────────────
const rejectFriendRequest = async (req, res, next) => {
  try {
    const { username } = req.params;
    const userId = req.userId;

    const requester = await User.findOne({ username });
    if (!requester) return sendError(res, 404, "User not found.");

    const me = await User.findById(userId);
    if (!me) return sendError(res, 404, "User not found.");

    const reqIdx = me.friendRequests.findIndex(
      (r) => r.from.toString() === requester._id.toString() && r.status === "pending"
    );
    if (reqIdx === -1) return sendError(res, 404, "No pending friend request from this user.");

    me.friendRequests[reqIdx].status = "rejected";
    await me.save();

    return sendSuccess(res, 200, {}, "Friend request rejected.");
  } catch (error) {
    logger.error(`Error in rejectFriendRequest: ${error.message}`);
    next(error);
  }
};

// ─── Remove friend ────────────────────────────────────────────────────────────
const removeFriend = async (req, res, next) => {
  try {
    const { username } = req.params;
    const userId = req.userId;

    const other = await User.findOne({ username });
    if (!other) return sendError(res, 404, "User not found.");

    await User.findByIdAndUpdate(userId, { $pull: { friends: other._id } });
    await User.findByIdAndUpdate(other._id, { $pull: { friends: userId } });

    return sendSuccess(res, 200, {}, "Friend removed.");
  } catch (error) {
    logger.error(`Error in removeFriend: ${error.message}`);
    next(error);
  }
};

// ─── Get friends list ─────────────────────────────────────────────────────────
const getFriends = async (req, res, next) => {
  try {
    const me = await User.findById(req.userId)
      .populate("friends", "username avatar eloRating college degree year")
      .lean();

    if (!me) return sendError(res, 404, "User not found.");
    return sendSuccess(res, 200, { friends: me.friends || [] }, "Friends retrieved.");
  } catch (error) {
    logger.error(`Error in getFriends: ${error.message}`);
    next(error);
  }
};

// ─── Get pending friend requests ──────────────────────────────────────────────
const getFriendRequests = async (req, res, next) => {
  try {
    const me = await User.findById(req.userId)
      .populate("friendRequests.from", "username avatar eloRating college")
      .lean();

    if (!me) return sendError(res, 404, "User not found.");

    const pending = (me.friendRequests || []).filter((r) => r.status === "pending");
    return sendSuccess(res, 200, { requests: pending }, "Friend requests retrieved.");
  } catch (error) {
    logger.error(`Error in getFriendRequests: ${error.message}`);
    next(error);
  }
};

// ─── Invite friend to battle ──────────────────────────────────────────────────
const inviteFriendToBattle = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { battleFormat = "1v1" } = req.body;
    const senderId = req.userId;

    const friend = await User.findOne({ username });
    if (!friend) return sendError(res, 404, "User not found.");

    const sender = await User.findById(senderId);
    if (!sender) return sendError(res, 404, "Sender not found.");

    // Must be friends
    if (!sender.friends.map(String).includes(friend._id.toString()))
      return sendError(res, 403, "You can only invite friends to battle.");

    // Create a room
    let roomId = "";
    // ensure unique
    do {
      roomId = generateRoomId();
    } while (await Room.findOne({ roomId }).lean());
    const room = await Room.create({
      roomId,
      creatorId: senderId,
      battleFormat,
      players: [senderId],
      status: "waiting_for_players",
    });

    // Send notification to the friend
    await Notification.create({
      recipientId: friend._id,
      type: "challenge_invite",
      title: "Battle Invite",
      message: `${sender.username} invited you to a ${battleFormat} battle!`,
      payload: { roomId, fromUsername: sender.username },
    });

    logger.info(`User ${senderId} invited ${username} to room ${roomId}`);
    return sendSuccess(res, 200, { roomId }, "Battle invite sent. Waiting for friend to join.");
  } catch (error) {
    logger.error(`Error in inviteFriendToBattle: ${error.message}`);
    next(error);
  }
};

// ─── Search users to add as friends ──────────────────────────────────────────
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2)
      return sendError(res, 400, "Search query must be at least 2 characters.");

    const users = await User.find({
      username: { $regex: q.trim(), $options: "i" },
      _id: { $ne: req.userId },
    })
      .select("username avatar eloRating college degree")
      .limit(10)
      .lean();

    return sendSuccess(res, 200, { users }, "Search results retrieved.");
  } catch (error) {
    logger.error(`Error in searchUsers: ${error.message}`);
    next(error);
  }
};

module.exports = {
  updateProfile,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
  inviteFriendToBattle,
  searchUsers,
};
