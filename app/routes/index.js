const express = require('express');
const router = express.Router();
const itemRoutes = require('./itemRoutes');
const db = require('../../config/database');
const dashboardController = require('../controllers/dashboardController');

// Halaman utama

router.get('/', dashboardController.index);

// REST API routes untuk /items
router.use('/items', itemRoutes);

module.exports = router;
