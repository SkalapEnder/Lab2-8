const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const Book = require("./models/Book");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

mongoose.connect('mongodb+srv://skalap2endra:kGOM7z5V54vBFdp1@cluster0.vannl.mongodb.net/books?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log("Index: Connected to MongoDB Atlas"))
    .catch(err => console.log("Error during connect to MongoDB: ", err));


// Enter point
// ################################
app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Fetch paginated books
        const books = await Book.find().skip(skip).limit(limit);
        const totalBooks = await Book.countDocuments();

        const genres = await Book.distinct('genres');
        const authors = await Book.distinct('authors');
        const years = await Book.distinct('year');

        res.render('index', {
            books: books,
            totalPages: Math.ceil(totalBooks / limit),
            currentPage: page,
            genres: genres,
            authors: authors,
            years: years,
            error: null,
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('index', { books: [], error: 'Failed to fetch books.' });
    }
});

app.get('/create', async (req, res) => { res.render('create')});

// Routes
// ################################
// MongoDB Atlas part
// Create new book
app.post('/api/books', async (req, res) => {
    const { title, author, genre, year, quantity, price } = req.body;

    if (title === undefined ||
        author === undefined ||
        genre === undefined ||
        year === undefined ||
        quantity === undefined ||
        price === undefined) {
        return res.status(400).json({ message: 'All fields (title, author, genre, year, quantity, price) are required '});
    }

    const authors = author.split(',').map(a => a.trim());
    const genres = genre.split(',').map(g => g.trim());

    try {
        const newID = await getNextFreeBookId();
        const newBook = new Book({
            book_id: newID,
            title: title,
            authors: authors,
            genres: genres,
            year: year,
            quantity: quantity,
            price: price,
        });
        await newBook.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).json({ message: 'Error creating book', error: err });
    }
});

// All books
app.get("/api/books", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Fetch paginated books
        const books = await Book.find().skip(skip).limit(limit);
        const totalBooks = await Book.countDocuments();

        res.json({
            books,
            totalPages: Math.ceil(totalBooks / limit),
            currentPage: page,
            totalBooks
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to fetch books" });
    }
});

// Specific book by ID
app.get("/api/books/:id", async (req, res) => {
    const book_id = Number(req.params.id);

    // Validate input
    if (isNaN(book_id)) {
        return res.status(400).json({ books: [], error: "Invalid book ID" });
    }

    try {
        const query = book_id === -1 ? {} : {book_id: book_id};
        const books = await Book.find(query);

        if (!books || books.length === 0) {
            return res.status(404).json({ books: [], error: "Book not found" });
        }

        res.json({ books: books, error: null });
    } catch (err) {
        console.error("Error retrieving book:", err);
        res.status(500).json({ books: [], error: "Internal server error" });
    }
});

app.post('/api/books/filter', async (req, res) => {
    const genre = req.body.genre;
    const author = req.body.author;
    const year = req.body.year;
    const sortBy = req.body.sortBy;
    const search = req.body.search

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        let query = {};
        if (genre !== "none") query.genres = { $in: [genre] };
        if (author !== "none") query.authors = { $in: [author] };
        if (year !== "none") query.year = parseInt(year);

        if (String(search) !== "") {
            query.$or = [
                { title: { $regex: String(search), $options: 'i' } },
                { authors: { $regex: String(search), $options: 'i' } },
                { genres: { $regex: String(search), $options: 'i' } }
            ];
        }

        // Define sorting options
        const sortOptions = {
            title: { title: 1 },
            author: { authors: 1 },
            year: { year: 1 },
            price: { price: 1 }
        };
        const sort = sortOptions[sortBy] || {};

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Fetch paginated and sorted books
        const books = await Book.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // Count total documents for pagination
        const totalBooks = await Book.countDocuments(query);

        res.json({
            books: books,
            totalPages: Math.ceil(totalBooks / limit),
            currentPage: page,
        });
    } catch (err) {
        console.error("Error retrieving books:", err);
        res.status(500).json({ books: [], error: err.message });
    }
});

// Update book
app.put('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, genre, year, quantity, price } = req.body;

    if (title === null || author === null || genre === null || year === null) {
        return res.status(400).json({ message: 'All fields (title, author, genre, year, quantity, price) are required' });
    }

    try {
        const updatedBook = await Book.findOneAndUpdate(
            { book_id: id },
            { title: title, authors: author, genres: genre, year: year, quantity: quantity, price: price },
            { new: true }
        );
        if (updatedBook=== null) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(updatedBook);
    } catch (err) {
        res.status(500).json({ message: 'Error updating book', error: err });
    }
});

// Delete book by ID
app.delete('/api/books/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const deletedBook = await Book.findOneAndDelete({book_id: Number(id)});
        if (deletedBook === null) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.status(200).json(deletedBook);
    } catch (err) {
        res.status(500).json({ message: 'Error deleting book', error: err });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


async function getNextFreeBookId() {
    try {
        const lastBook = await Book.find({}).sort({ book_id: -1 });
        if (lastBook === null || lastBook.length === 0) {
            return 0;
        }
        return lastBook[0]['book_id'] + 1;
    } catch (err) {
        console.error('Error retrieving next free user_id:', err.message);
        throw new Error('Failed to retrieve next free user ID');
    }
}