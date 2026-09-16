/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected
router.get('/me', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

// Admin only
router.get('/users', authenticate, roleCheck('admin'), authController.getAllUsers);
router.get('/stats', authenticate, roleCheck('admin'), authController.getStats);
router.put('/users/:id/role', authenticate, roleCheck('admin'), authController.updateUserRole);

module.exports = router;