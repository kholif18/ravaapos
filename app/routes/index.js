const express = require('express');
const router = express.Router();
const itemRoutes = require('./itemRoutes');
const db = require('../../config/database');
const dashboardController = require('../controllers/dashboardController');
const categoryRoutes = require('./category');
const supplierRoutes = require('./suppliers');
const customerRoutes = require('./customers');
const posRouter = require('./pos');

// Halaman utama

router.get('/', dashboardController.index);

router.use('/pos', posRouter);

router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);

// REST API routes untuk /items
router.use('/items', itemRoutes);

module.exports = router;
