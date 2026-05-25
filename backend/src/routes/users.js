const express = require("express");
const { auth } = require("../middleware/auth");
const { getLeaderboard } = require("../controllers/userController");

const router = express.Router();

router.get("/leaderboard", auth, getLeaderboard);

module.exports = router;
