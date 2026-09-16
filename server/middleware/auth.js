/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID token — no demo fallback
 */
const admin = require('../config/firebase');
const { firebaseInitialized } = require('../config/firebase');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const idToken = authHeader.split('Bearer ')[1];

        if (!firebaseInitialized) {
            return res.status(503).json({
                success: false,
                message: 'Authentication service unavailable. Please try again later.',
            });
        }

        let decodedToken = null;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (firebaseError) {
            console.warn('Firebase token verification failed:', firebaseError.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token. Please log in again.',
            });
        }

        if (!decodedToken || !decodedToken.uid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token payload.',
            });
        }

        // Find user in MongoDB
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: 'Database unavailable. Please try again later.',
            });
        }

        try {
            const user = await User.findOne({ firebaseUid: decodedToken.uid });
            if (user) {
                await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
                req.user = user;
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Account not found. Please sign up first.',
                });
            }
        } catch (dbError) {
            console.warn('DB query failed:', dbError.message);
            return res.status(500).json({
                success: false,
                message: 'Authentication failed. Please try again.',
            });
        }

        req.firebaseUser = decodedToken;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed.',
        });
    }
};

module.exports = authenticate;