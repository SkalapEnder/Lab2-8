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
    console.log("2", book_id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    console.log(book_id)
    try {
        let books = await Book.find({ book_id: book_id }).skip(skip).limit(limit);
        const totalBooks = await Book.countDocuments({ book_id: book_id });

        if (!books || books.length === 0) {
            return res.status(404).json({ books: [], error: "Book not found" });
        }

        const genres = await Book.distinct('genres');
        const authors = await Book.distinct('authors');
        const years = await Book.distinct('year');
        console.log("HERE")
        res.render('index', {
            books: books,
            totalPages: Math.ceil(totalBooks / limit),
            currentPage: page,
            genres: genres,
            authors: authors,
            years: years,
            error: null,
        });
    } catch (err) {
        console.error("Error retrieving book:", err);
        res.status(500).json({ message: "Error retrieving books", error: err });
    }
});

// Filtering part
app.post('/api/books/filter', async (req, res) => {
    const { genre, author, year, sortBy, search } = req.query;

    try {
        let query = {};

        if (genre !== "none") query.genres = { $in: [genre] };

        if (author !== "none") query.authors = { $in: [author] };

        if (year !== "none") query.year = year;

        if (search !== "") {
            query.$or = [
                { title: { $regex: search, $options: 'i' } }
            ];
        } else {
            query.$or = [{ title: {} }];
        }

        let books = await Book.find(query);

        if (sortBy) {
            const sortOptions = {
                title: { title: 1 },
                author: { authors: 1 },
                year: { year: 1 },
                price: { price: 1 }
            };

            if (sortOptions[sortBy]) {
                books = books.sort(sortOptions[sortBy]);
            }
        }

        res.json(books);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving books', error: err });
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