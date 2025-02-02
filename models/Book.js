const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    book_id: {type: Number, required: true, unique: true},
    title: { type: String, required: true },
    author: { type: [String], required: true },
    genre: { type: [String], required: true },
    year: { type: Number, required: true },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0.0 }
});

const Book = mongoose.model('book', bookSchema);
module.exports = Book;