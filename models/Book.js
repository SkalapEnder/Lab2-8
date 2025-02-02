const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    book_id: {type: Number, required: true, unique: true},
    title: { type: String, required: true },
    authors: { type: [String], required: true },
    genres: { type: [String], required: true },
    year: { type: Number, required: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0.0 }
});

const Book = mongoose.model('book', bookSchema);
module.exports = Book;