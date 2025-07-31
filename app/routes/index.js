const express = require('express');
const router = express.Router();
const itemRoutes = require('./itemRoutes');
const db = require('../../config/database');
const dashboardController = require('../controllers/dashboardController');
const categoryRoutes = require('./category');
const supplierRoutes = require('./suppliers');

// Halaman utama

router.get('/', dashboardController.index);

router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);

// REST API routes untuk /items
router.use('/items', itemRoutes);

module.exports = router;
