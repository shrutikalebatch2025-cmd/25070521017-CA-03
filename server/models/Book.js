
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    author: {
      type: String,
      required: true,
      trim: true
    },

    genre: {
      type: String,
      default: "Other"
    },

    year: {
      type: Number,
      default: null
    },

    status: {
      type: String,
      enum: ["Want to Read", "Reading", "Completed"],
      default: "Want to Read"
    },

    readingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    isFavorite: {
      type: Boolean,
      default: false
    },

    startedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
