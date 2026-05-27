const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');

const {
    isAuthenticated,
    isAdmin
} = require('../middleware/auth');

// Routes
const authRoutes = require('./auth');
const productRoutes = require('./product');
const categoryRoutes = require('./category');
const supplierRoutes = require('./suppliers');
const customerRoutes = require('./customers');
const posRouter = require('./pos');
const stockRoutes = require('./stock');
const purchasingRoutes = require('./purchasing');
const salesRoutes = require('./sales');
const promoRoutes = require('./promo');
const apiRoutes = require('./api');
const userRoutes = require('./users');
const piutangRoutes = require('./piutang');

// AUTH
router.use('/', authRoutes);

// Dashboard
router.get('/dashboard', isAuthenticated, dashboardController.index);

// User Management
router.use('/users', isAuthenticated, userRoutes);

// Modules
router.use('/piutang', isAuthenticated, piutangRoutes);
router.use('/pos', isAuthenticated, posRouter);
router.use('/categories', isAuthenticated, categoryRoutes);
router.use('/suppliers', isAuthenticated, supplierRoutes);
router.use('/customers', isAuthenticated, customerRoutes);
router.use('/purchasing', isAuthenticated, purchasingRoutes);
router.use('/sales', isAuthenticated, salesRoutes);
router.use('/promo', isAuthenticated, promoRoutes);
router.use('/api', isAuthenticated, apiRoutes);
router.use('/products', isAuthenticated, productRoutes);
router.use('/stock', isAuthenticated, stockRoutes);

// Default route
router.use('/', isAuthenticated, posRouter);

// Admin only
router.post('/pos/void', isAuthenticated, isAdmin, posRouter);

module.exports = router;