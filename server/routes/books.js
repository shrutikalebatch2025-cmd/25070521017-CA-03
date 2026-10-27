
const express = require("express");
const mongoose = require("mongoose");
const Book = require("../models/Book");
const authenticate = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

const validStatuses = [
  "Want to Read",
  "Reading",
  "Completed"
];

function validateBook(body) {
  const title = String(body.title || "").trim();
  const author = String(body.author || "").trim();
  const genre = String(body.genre || "Other").trim();
  const status = body.status || "Want to Read";

  if (!title || title.length > 200) {
    return {
      error: "Title is required (maximum 200 characters)."
    };
  }

  if (!author || author.length > 120) {
    return {
      error: "Author is required (maximum 120 characters)."
    };
  }

  if (!validStatuses.includes(status)) {
    return {
      error: "Select a valid reading status."
    };
  }

  let year = null;

  if (
    body.year !== "" &&
    body.year !== null &&
    body.year !== undefined
  ) {
    year = Number(body.year);

    if (!Number.isInteger(year) || year < 0 || year > 2100) {
      return {
        error: "Enter a valid publication year."
      };
    }
  }

  // Reading progress must be a number from 0 to 100.
  let readingProgress = 0;

  if (body.readingProgress !== undefined) {
    readingProgress = Number(body.readingProgress);

    if (
      !Number.isFinite(readingProgress) ||
      readingProgress < 0 ||
      readingProgress > 100
    ) {
      return {
        error: "Reading progress must be between 0 and 100."
      };
    }
  }

  const isFavorite =
    body.isFavorite === true || body.isFavorite === "true";

  // Keep progress and status consistent.
  if (status === "Completed") {
    readingProgress = 100;
  } else if (status === "Want to Read") {
    readingProgress = 0;
  }

  return {
    data: {
      title,
      author,
      genre: genre || "Other",
      status,
      year,
      readingProgress,
      isFavorite
    }
  };
}

// Get all books belonging to the logged-in user.
router.get("/", async (req, res) => {
  try {
    const books = await Book.find({
      ownerId: req.userId
    }).sort({ createdAt: -1 });

    res.json(books);
  } catch (error) {
    console.error("Load books error:", error);
    res.status(500).json({
      message: "Could not load books."
    });
  }
});

// Add a new book.
router.post("/", async (req, res) => {
  try {
    const result = validateBook(req.body);

    if (result.error) {
      return res.status(400).json({
        message: result.error
      });
    }

    const now = new Date();

    const bookData = {
      ...result.data,
      ownerId: req.userId,
      startedAt:
        result.data.status === "Reading" ? now : null,
      completedAt:
        result.data.status === "Completed" ? now : null
    };

    const book = await Book.create(bookData);

    res.status(201).json(book);
  } catch (error) {
    console.error("Add book error:", error);
    res.status(500).json({
      message: "Could not add book."
    });
  }
});

// Update a book owned by the logged-in user.
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid book ID."
      });
    }

    const result = validateBook(req.body);

    if (result.error) {
      return res.status(400).json({
        message: result.error
      });
    }

    const existingBook = await Book.findOne({
      _id: req.params.id,
      ownerId: req.userId
    });

    if (!existingBook) {
      return res.status(404).json({
        message: "Book not found."
      });
    }

    const now = new Date();
    const previousStatus = existingBook.status;
    const newStatus = result.data.status;

    const updateData = {
      ...result.data
    };

    // Record the first time the user starts reading.
    if (newStatus === "Reading") {
      updateData.startedAt =
        existingBook.startedAt || now;
      updateData.completedAt = null;
    }

    // Record when the book is completed.
    if (newStatus === "Completed") {
      updateData.readingProgress = 100;
      updateData.startedAt =
        existingBook.startedAt || now;

      updateData.completedAt =
        previousStatus === "Completed"
          ? existingBook.completedAt || now
          : now;
    }

    // Reset progress when moved back to the wishlist.
    if (newStatus === "Want to Read") {
      updateData.readingProgress = 0;
      updateData.startedAt = null;
      updateData.completedAt = null;
    }

    const book = await Book.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.userId
      },
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.json(book);
  } catch (error) {
    console.error("Update book error:", error);
    res.status(500).json({
      message: "Could not update book."
    });
  }
});

// Delete a book owned by the logged-in user.
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid book ID."
      });
    }

    const book = await Book.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.userId
    });

    if (!book) {
      return res.status(404).json({
        message: "Book not found."
      });
    }

    res.json({
      message: "Book deleted successfully."
    });
  } catch (error) {
    console.error("Delete book error:", error);
    res.status(500).json({
      message: "Could not delete book."
    });
  }
});

module.exports = router;
