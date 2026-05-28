const express = require("express");
const { auth } = require("../middleware/auth");
const { getPublicProfile } = require("../controllers/publicProfileController");

const router = express.Router();

router.get("/:username", auth, getPublicProfile);

module.exports = router;
