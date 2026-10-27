
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Test route
app.get("/", (req, res) => {
  res.send("ReadTrack Backend is running!");
});

// Health-check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ReadTrack backend is running.",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected"
  });
});

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/books", require("./routes/books"));

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found."
  });
});

// Handle unexpected errors
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    message:
      err.status === 400
        ? "Invalid request data."
        : "An unexpected server error occurred."
  });
});

// Start server and connect MongoDB
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing. Check your .env file."
      );
    }

    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.length < 32
    ) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters long."
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");

    const PORT = Number(process.env.PORT) || 5000;

    const server = app.listen(PORT, () => {
      console.log(
        `ReadTrack server running at http://localhost:${PORT}`
      );

      console.log(
        `Health check: http://localhost:${PORT}/api/health`
      );
    });

    // Gracefully close the server and database
    async function shutdown() {
      console.log("Shutting down ReadTrack server...");

      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log("MongoDB connection closed.");
          process.exit(0);
        } catch (error) {
          console.error(
            "Shutdown error:",
            error.message
          );
          process.exit(1);
        }
      });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
