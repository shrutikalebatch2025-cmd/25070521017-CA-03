
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api/books";

const emptyBook = {
  title: "",
  author: "",
  genre: "Fiction",
  year: "",
  status: "Want to Read",
};

function App() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyBook);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genreFilter, setGenreFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBooks() {
    try {
      setError("");
      const response = await fetch(API);
      if (!response.ok) throw new Error("Could not load books.");
      setBooks(await response.json());
    } catch {
      setError("Cannot connect to the backend. Check that your server is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const query = search.toLowerCase();
      const matchesSearch =
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || book.status === statusFilter;
      const matchesGenre =
        genreFilter === "All" || book.genre === genreFilter;

      return matchesSearch && matchesStatus && matchesGenre;
    });
  }, [books, search, statusFilter, genreFilter]);

  const completed = books.filter((book) => book.status === "Completed").length;
  const reading = books.filter((book) => book.status === "Reading").length;

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : null,
      };

      const response = await fetch(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Could not save the book.");
      }

      setForm(emptyBook);
      setEditingId(null);
      await loadBooks();
    } catch (err) {
      setError(err.message || "Could not save the book.");
    }
  }

  function startEditing(book) {
    setForm({
      title: book.title,
      author: book.author,
      genre: book.genre || "Other",
      year: book.year ?? "",
      status: book.status,
    });
    setEditingId(book._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteBook(id) {
    if (!window.confirm("Are you sure you want to delete this book?")) return;

    try {
      const response = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete the book.");
      await loadBooks();
    } catch (err) {
      setError(err.message);
    }
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyBook);
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">R</span>
          ReadTrack
        </a>
        <span className="topbar-note">YOUR PERSONAL READING SPACE</span>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <span className="eyebrow">THE JOY OF READING</span>
          <h1>Your next chapter<br />starts here.</h1>
          <p>Keep your books organized. Track your progress. Make every page count.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="book book-one">READ<br />MORE</div>
          <div className="book book-two">YOUR<br />STORY</div>
          <div className="book book-three">ONE<br />PAGE</div>
          <span className="sparkle">✳</span>
        </div>
      </section>

      <section className="stats">
        <article className="stat-card">
          <span className="stat-icon">▤</span>
          <div><span>Total books</span><strong>{books.length}</strong></div>
        </article>
        <article className="stat-card">
          <span className="stat-icon">◷</span>
          <div><span>Currently reading</span><strong>{reading}</strong></div>
        </article>
        <article className="stat-card">
          <span className="stat-icon">✓</span>
          <div><span>Books completed</span><strong>{completed}</strong></div>
        </article>
      </section>

      <section className="content-grid">
        <aside className="form-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR LIBRARY</span>
              <h2>{editingId ? "Edit book" : "Add a book"}</h2>
            </div>
            <span className="heading-icon">＋</span>
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              Book title *
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. The Alchemist"
                required
              />
            </label>
            <label>
              Author *
              <input
                name="author"
                value={form.author}
                onChange={handleChange}
                placeholder="e.g. Paulo Coelho"
                required
              />
            </label>
            <div className="form-row">
              <label>
                Genre
                <select name="genre" value={form.genre} onChange={handleChange}>
                  {["Fiction", "Fantasy", "Mystery", "Romance", "Science", "Self-help", "Biography", "Other"].map((genre) => (
                    <option key={genre}>{genre}</option>
                  ))}
                </select>
              </label>
              <label>
                Published
                <input
                  name="year"
                  type="number"
                  min="0"
                  max="2100"
                  value={form.year}
                  onChange={handleChange}
                  placeholder="Year"
                />
              </label>
            </div>
            <label>
              Reading status
              <select name="status" value={form.status} onChange={handleChange}>
                <option>Want to Read</option>
                <option>Reading</option>
                <option>Completed</option>
              </select>
            </label>
            <button className="primary-btn" type="submit">
              {editingId ? "Save changes" : "+ Add to my library"}
            </button>
            {editingId && (
              <button className="cancel-btn" type="button" onClick={cancelEditing}>
                Cancel editing
              </button>
            )}
          </form>
        </aside>

        <section className="library">
          <div className="library-heading">
            <div>
              <span className="eyebrow">COLLECT YOUR STORIES</span>
              <h2>My bookshelf <span className="count">{books.length}</span></h2>
            </div>
          </div>

          <div className="filters">
            <input
              className="search-input"
              placeholder="Search title or author..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All</option>
              <option>Want to Read</option>
              <option>Reading</option>
              <option>Completed</option>
            </select>
            <select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}>
              <option>All</option>
              {["Fiction", "Fantasy", "Mystery", "Romance", "Science", "Self-help", "Biography", "Other"].map((genre) => (
                <option key={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {error && <p className="error-message">{error}</p>}

          {loading ? (
            <div className="empty-state">Loading your bookshelf...</div>
          ) : filteredBooks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">▤</span>
              <h3>{books.length ? "No matching books" : "Your story starts with one book."}</h3>
              <p>{books.length ? "Try changing your search or filters." : "Add your first book using the form."}</p>
            </div>
          ) : (
            <div className="book-list">
              {filteredBooks.map((book) => (
                <article className="book-card" key={book._id}>
                  <div className="book-cover">
                    <span>{book.title.slice(0, 1).toUpperCase()}</span>
                    <small>READTRACK</small>
                  </div>
                  <div className="book-info">
                    <span className="genre-tag">{book.genre || "Other"}</span>
                    <h3>{book.title}</h3>
                    <p>by {book.author}</p>
                    <div className="book-meta">
                      {book.year && <span>{book.year}</span>}
                      <span className={`status status-${book.status.toLowerCase().replaceAll(" ", "-")}`}>
                        {book.status}
                      </span>
                    </div>
                    <div className="book-actions">
                      <button type="button" onClick={() => startEditing(book)}>Edit</button>
                      <button type="button" className="delete-btn" onClick={() => deleteBook(book._id)}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <footer>Made for readers, one page at a time. <span>ReadTrack © 2026</span></footer>
    </main>
  );
}

export default App;
