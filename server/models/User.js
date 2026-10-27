
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    // Daily reading goal in minutes
    readingGoalMinutes: {
      type: Number,
      default: 30,
      min: 1,
      max: 1440
    },

    // Daily reading records used to calculate streaks
    readingLogs: [
      {
        date: {
          type: String,
          required: true
        },

        minutes: {
          type: Number,
          default: 0,
          min: 0
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
