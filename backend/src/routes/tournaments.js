const express = require("express");
const { auth } = require("../middleware/auth");
const {
  createTournament,
  registerForTournament,
  getTournament,
  getTournaments,
} = require("../controllers/tournamentController");

const router = express.Router();

router.post("/", auth, createTournament);
router.get("/", auth, getTournaments);
router.get("/:id", auth, getTournament);
router.post("/:id/register", auth, registerForTournament);

module.exports = router;
