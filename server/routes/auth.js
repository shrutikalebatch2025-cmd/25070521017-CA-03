
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authenticate = require("../middleware/auth");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.TOKEN_EXPIRES_IN || "1d"
    }
  );
}

function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    readingGoalMinutes: user.readingGoalMinutes ?? 30
  };
}

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!name || name.length > 80) {
      return res.status(400).json({
        message: "Enter a valid name."
      });
    }

    if (!emailIsValid(email) || email.length > 254) {
      return res.status(400).json({
        message: "Enter a valid email address."
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must contain 8–72 characters."
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        message: "This email is already registered. Please log in."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash
    });

    return res.status(201).json({
      message: "Account created successfully.",
      token: createToken(user),
      user: getPublicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered."
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Could not create account."
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email }).select(
      "+passwordHash"
    );

    if (
      !user ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(user),
      user: getPublicUser(user)
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Could not log in."
    });
  }
});

// GET CURRENT USER
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Account not found."
      });
    }

    res.json({
      user: getPublicUser(user),
      readingLogs: user.readingLogs || []
    });
  } catch (error) {
    console.error("Load account error:", error.message);

    res.status(500).json({
      message: "Could not load your account."
    });
  }
});

// UPDATE DAILY READING GOAL
router.put("/reading-goal", authenticate, async (req, res) => {
  try {
    const goal = Number(req.body.readingGoalMinutes);

    if (
      !Number.isInteger(goal) ||
      goal < 1 ||
      goal > 1440
    ) {
      return res.status(400).json({
        message: "Reading goal must be between 1 and 1440 minutes."
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { readingGoalMinutes: goal },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        message: "Account not found."
      });
    }

    res.json({
      message: "Daily reading goal updated.",
      readingGoalMinutes: user.readingGoalMinutes
    });
  } catch (error) {
    console.error("Reading goal error:", error.message);

    res.status(500).json({
      message: "Could not update reading goal."
    });
  }
});

// ADD READING MINUTES FOR A DAY
router.post("/reading-log", authenticate, async (req, res) => {
  try {
    const minutes = Number(req.body.minutes);
    const date = req.body.date;

    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 1440
    ) {
      return res.status(400).json({
        message: "Minutes must be a whole number between 1 and 1440."
      });
    }

    // Accept a date in YYYY-MM-DD format.
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        message: "Provide a date in YYYY-MM-DD format."
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        message: "Enter a valid calendar date."
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    if (date > today) {
      return res.status(400).json({
        message: "Reading logs cannot be added for future dates."
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Account not found."
      });
    }

    const existingLog = user.readingLogs.find(
      (log) => log.date === date
    );

    if (existingLog) {
      existingLog.minutes += minutes;
    } else {
      user.readingLogs.push({
        date,
        minutes
      });
    }

    await user.save();

    const updatedLog = user.readingLogs.find(
      (log) => log.date === date
    );

    res.json({
      message: "Reading time saved.",
      readingGoalMinutes: user.readingGoalMinutes,
      readingLog: updatedLog,
      readingLogs: user.readingLogs
    });
  } catch (error) {
    console.error("Reading log error:", error.message);

    res.status(500).json({
      message: "Could not save reading time."
    });
  }
});

module.exports = router;
