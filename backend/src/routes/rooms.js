const express = require("express");
const { auth } = require("../middleware/auth");
const {
  createRoom,
  validateReferenceSolution,
  submitProblem,
} = require("../controllers/roomController");

const router = express.Router();

router.post("/", auth, createRoom);
router.post("/:roomId/validate", auth, validateReferenceSolution);
router.post("/:roomId/problem", auth, submitProblem);

module.exports = router;
