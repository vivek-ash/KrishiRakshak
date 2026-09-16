/**
 * Auth Controller
 * Handles user registration, login sync, profile management
 * First registered user becomes admin automatically
 */
const User = require('../models/User');
const mongoose = require('mongoose');

// POST /api/auth/login — Login: only allows already-registered users
exports.login = async (req, res) => {
    try {
        const { firebaseUid, email } = req.body;

        const user = await User.findOne({ firebaseUid });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Account not found. Please sign up first.',
            });
        }
        user.lastLogin = new Date();
        await User.findByIdAndUpdate(user._id, { lastLogin: user.lastLogin });
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/register — Register or sync user after Firebase signup
exports.register = async (req, res) => {
    try {
        const { firebaseUid, name, email, phone, language, address } = req.body;

        let user = await User.findOne({ firebaseUid });
        if (user) {
            return res.status(200).json({ success: true, data: user, message: 'User already exists.' });
        }

        // First-user-admin logic: if no users exist, first user becomes admin
        const userCount = await User.countDocuments();
        const assignedRole = userCount === 0 ? 'admin' : 'farmer';

        user = await User.create({
            firebaseUid, name, email, phone,
            role: assignedRole,
            language: language || 'en',
            address,
        });

        if (assignedRole === 'admin') {
            console.log(`👑 First user "${name}" registered as admin`);
        }

        return res.status(201).json({ success: true, data: user });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/auth/me — Get current user profile
exports.getProfile = async (req, res) => {
    try {
        res.json({ success: true, data: req.user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/auth/profile — Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const allowed = ['name', 'phone', 'language', 'address', 'location', 'avatar'];
        const updates = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });
        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
        return res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/auth/users — Admin: list all users
exports.getAllUsers = async (req, res) => {
    try {
        const { role, page = 1, limit = 20, search } = req.query;
        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
        const total = await User.countDocuments(query);
        return res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/auth/stats — Admin: system stats
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalFarmers = await User.countDocuments({ role: 'farmer' });
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const activeToday = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 86400000) } });
        return res.json({ success: true, data: { totalUsers, totalFarmers, totalAdmins, activeToday } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/auth/users/:id/role — Admin: change user role
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['farmer', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role. Must be "farmer" or "admin".' });
        }

        // Prevent admin from demoting themselves if they are the only admin
        if (role === 'farmer') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            const targetUser = await User.findById(req.params.id);
            if (targetUser?.role === 'admin' && adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot demote the only admin. Promote another user to admin first.',
                });
            }
        }

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        return res.json({ success: true, data: user, message: `User role updated to ${role}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};