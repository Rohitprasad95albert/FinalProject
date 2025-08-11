// backend/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const mongoURL = process.env.MONGODB_URL;

mongoose.connect(mongoURL)
  .then(() => {
    console.log('✅ Connected to MongoDB Server');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

const db = mongoose.connection;

db.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

module.exports = db;