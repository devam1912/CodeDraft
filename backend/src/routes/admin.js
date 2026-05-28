const express = require("express");
const { auth } = require("../middleware/auth");
const { getTelemetry } = require("../controllers/adminController");

const router = express.Router();

router.get("/telemetry", auth, getTelemetry);

module.exports = router;
