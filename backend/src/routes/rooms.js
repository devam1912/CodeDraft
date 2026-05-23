const express = require("express");
const { auth } = require("../middleware/auth");
const { createRoom } = require("../controllers/roomController");

const router = express.Router();

router.post("/", auth, createRoom);

module.exports = router;
