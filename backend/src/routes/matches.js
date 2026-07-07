const express = require("express");
const { auth } = require("../middleware/auth");
const { getMatchHistory } = require("../controllers/matchController");

const router = express.Router();

router.get("/user/me", auth, getMatchHistory);

module.exports = router;
