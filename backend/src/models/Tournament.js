const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "finished"],
      default: "draft",
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    rounds: [
      {
        roundNumber: {
          type: Number,
          required: true,
        },
        matches: [
          {
            roomId: {
              type: String,
            },
            playerA: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            playerB: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            winnerId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tournament", tournamentSchema);
