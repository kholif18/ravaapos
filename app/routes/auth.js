const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const firstSetup = require('../middleware/firstSetup');

// Login
router.get('/login', authController.login);
router.post('/login', authController.authenticate);

// Logout
router.get('/logout', authController.logout);

// First setup register
router.get('/register', firstSetup, authController.registerPage);
router.post('/register', firstSetup, authController.register);

// Forgot password
router.get('/forgot-password', authController.forgotPasswordPage);
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.get('/reset-password/:token', authController.resetPasswordPage);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;