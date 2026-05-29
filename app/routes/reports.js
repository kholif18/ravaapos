const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated, isAdmin);

router.get('/', reportController.index);
router.get('/sales/export', reportController.exportSalesReport);
router.get('/sales', reportController.salesReport);
router.get('/best-sellers', reportController.bestSellerReport);
router.get('/payments', reportController.paymentReport);
router.get('/cashier', reportController.cashierReport);
router.get('/stock-movement', reportController.stockMovementReport);
router.get('/low-stock', reportController.lowStockReport);
router.get('/profit-loss', reportController.profitLossReport);

module.exports = router;
