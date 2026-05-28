const express = require("express");
const { auth } = require("../middleware/auth");
const { getPublicProfile, sendChallengeInvite } = require("../controllers/publicProfileController");

const router = express.Router();

router.get("/:username", auth, getPublicProfile);
router.post("/:username/challenge", auth, sendChallengeInvite);

module.exports = router;
