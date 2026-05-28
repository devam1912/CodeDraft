const express = require("express");
const { auth } = require("../middleware/auth");
const { getMatchReplay, getMatchHistory } = require("../controllers/matchController");

const router = express.Router();

router.get("/user/me", auth, getMatchHistory);
router.get("/:roomId", auth, getMatchReplay);

module.exports = router;
