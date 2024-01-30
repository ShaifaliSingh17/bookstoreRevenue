const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost/bookstore', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Book Schema
const bookSchema = new mongoose.Schema({
    bookId: { type: String, unique: true },
    title: { type: String, unique: true },
    authors: [String],
    sellCount: { type: Number, default: 0 },
    description: String,
    price: { type: Number, min: 100, max: 1000 }
});

// Purchase History Schema
const purchaseSchema = new mongoose.Schema({
    purchaseId: { type: String, unique: true },
    bookId: String,
    userId: String,
    purchaseDate: { type: Date, default: Date.now },
    price: Number
});

// Models
const Book = mongoose.model('Book', bookSchema);
const PurchaseHistory = mongoose.model('PurchaseHistory', purchaseSchema);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com',
        pass: 'your_password'
    }
});

// Route to handle book purchase
app.post('/api/purchase', async (req, res) => {
    const { bookId, userId, price } = req.body;
    try {
        const purchase = new PurchaseHistory({
            purchaseId: generatePurchaseId(),
            bookId,
            userId,
            price
        });
        const savedPurchase = await purchase.save();
        await Book.findOneAndUpdate({ bookId }, { $inc: { sellCount: 1 } });
        const book = await Book.findOne({ bookId });
        if (book) {
            // Send email to authors
            sendEmailToAuthors(book.authors, price);
        }
        res.status(201).json(savedPurchase);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Generate unique purchase ID
function generatePurchaseId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    // Generate a random numeric ID
    const numericId = Math.floor(Math.random() * 1000);
    return `${year}-${month}-${numericId}`;
}

// Send email to authors
function sendEmailToAuthors(authors, price) {
    const mailOptions = {
        from: 'your_email@gmail.com',
        to: authors.join(','),
        subject: 'Your book has been purchased',
        text: `Congratulations! Your book has been purchased for $${price}.`
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Email sending error:', err);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
