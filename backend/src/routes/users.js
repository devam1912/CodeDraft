const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getLeaderboard,
  getCollegeLeaderboard,
  getProfile,
  getProblemsCreated,
  updateAvatar,
} = require("../controllers/userController");

const router = express.Router();

router.get("/profile", auth, getProfile);
router.get("/problems-created", auth, getProblemsCreated);
router.get("/leaderboard/college", auth, getCollegeLeaderboard);
router.get("/leaderboard", auth, getLeaderboard);
router.patch("/avatar", auth, updateAvatar);

module.exports = router;
