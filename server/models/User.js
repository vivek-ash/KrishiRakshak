/**
 * User Model
 * Stores user profile data linked to Firebase Auth UID
 * Supports Admin and Farmer roles
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 100,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    role: {
        type: String,
        enum: ['farmer', 'admin'],
        default: 'farmer',
    },
    language: {
        type: String,
        enum: ['en', 'hi', 'pa'],
        default: 'en',
    },
    location: {
        type: { type: String, enum: ['Point'] },  // No default → location not injected unless explicitly set
        coordinates: { type: [Number] },
    },
    address: {
        village: String,
        district: String,
        state: String,
        pincode: String,
    },
    avatar: {
        type: String,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Geospatial index for location-based queries
userSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
