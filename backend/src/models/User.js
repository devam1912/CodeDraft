const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    eloRating: {
      type: Number,
      default: 1000,
      index: true,
    },
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    draws: {
      type: Number,
      default: 0,
    },
    matchesPlayed: {
      type: Number,
      default: 0,
    },
    college: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    collegeEmail: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    spectatorPredictions: {
      correct: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    eloHistory: [
      {
        eloRating: { type: Number },
        roomId: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.index({ eloRating: -1, wins: -1 });
userSchema.index({ college: 1, eloRating: -1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) {
    return next();
  }
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.avatar && this.username) {
    const initials = this.username.slice(0, 2).toUpperCase();
    this.avatar = initials;
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    eloRating: this.eloRating,
    wins: this.wins,
    losses: this.losses,
    draws: this.draws,
    matchesPlayed: this.matchesPlayed,
    college: this.college,
    avatar: this.avatar,
    spectatorPredictions: this.spectatorPredictions,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);

module.exports = User;
