/**
 * MongoDB Atlas Connection Configuration
 * Connects to cloud MongoDB instance using Mongoose
 */
const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set. Please configure your .env file.');
    }

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
