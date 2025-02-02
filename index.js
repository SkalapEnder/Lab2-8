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
        const { page = 1, limit = 10 } = req.query;
        const data = await getBooks(page, limit);

        const genres = await Book.distinct('genre');
        const authors = await Book.distinct('author');
        const years = await Book.distinct('year');

        res.render('index', {
            books: data.books,
            totalPages: data.totalPages,
            currentPage: data.currentPage,
            genres,
            authors,
            years,
            error: null,
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('index', { books: [], error: 'Failed to fetch books.' });
    }
});

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

    try {
        const newID = await getNextFreeBookId();
        const newBook = new Book({
            book_id: newID,
            title: title,
            author: author,
            genre: genre,
            year: year,
            quantity: quantity,
            price: price,
        });
        await newBook.save();
        res.status(201).json(newBook);
    } catch (err) {
        res.status(500).json({ message: 'Error creating book', error: err });
    }
});

// All books
app.get('/api/books', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const data = await getBooks(page, limit);
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});
// Specific book by ID
app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const book = await Book.findOne({book_id: id});
        if (book === null || book === undefined) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(book);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving book', error: err });
    }
});

// Update book
app.put('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, genre, year, quantity, price } = req.body;

    if (!title || !author || !genre || !year) {
        return res.status(400).json({ message: 'All fields (title, author, genre, year, quantity, price) are required' });
    }

    try {
        const updatedBook = await Book.findOneAndUpdate(
            { book_id: id },
            { title: title, author: author, genre: genre, year: year, quantity: quantity, price: price },
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
        res.json(deletedBook);
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

async function getBooks(page = 1, limit = 10, filters = {}) {
    try {
        const skip = (page - 1) * limit;
        const books = await Book.find(filters).skip(skip).limit(limit);
        const totalBooks = await Book.countDocuments(filters);
        return {
            books,
            totalPages: Math.ceil(totalBooks / limit),
            currentPage: page,
        };
    } catch (error) {
        console.error('Error fetching books:', error);
        throw new Error('Failed to fetch books');
    }
}