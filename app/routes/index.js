const express = require('express');
const router = express.Router();
const productRoutes = require('./product');
const db = require('../../config/database');
const dashboardController = require('../controllers/dashboardController');
const categoryRoutes = require('./category');
const supplierRoutes = require('./suppliers');
const customerRoutes = require('./customers');
const posRouter = require('./pos');
const stockRoutes = require('./stock');
const purchasingRoutes = require('./purchasing');
const salesRoutes = require('./sales');
const promoRoutes = require('./promo');
const apiRoutes = require('./api');

// Halaman utama

router.get('/', dashboardController.index);

router.use('/pos', posRouter);

router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/purchasing', purchasingRoutes);
router.use('/sales', salesRoutes);
router.use('/promo', promoRoutes);
router.use('/api', apiRoutes);

// REST API routes untuk /products
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);

module.exports = router;
