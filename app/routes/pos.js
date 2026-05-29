// routes/posRoutes.js
const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const { requireOpenSession } = require('../middleware/cashierSession');

// GET routes
router.get('/', requireOpenSession, posController.index);
router.get('/search', posController.searchProducts);
router.get('/favorites', posController.getFavoriteProducts);
router.get('/customers', posController.getCustomers);
router.get('/next-invoice', posController.getNextInvoiceNumber);
router.get('/transaction-history', posController.getTransactionHistory);
router.get('/daily-report', posController.getDailySalesReport);
router.get('/debug', posController.debug);

const { isAdmin } = require('../middleware/auth');

// POST routes
router.post('/save-transaction', requireOpenSession, posController.saveTransaction);
router.post('/apply-promo', posController.applyPromo);
router.post('/void-transaction', isAdmin, posController.voidTransaction);

router.get('/transaction/:invoice', posController.getTransaction);
router.post('/refund', posController.refundTransaction);

// GET with params
router.get('/product/:barcode', posController.getProductByBarcode);
router.get('/search-customers', posController.searchCustomers);

// Checkout dengan support hutang
router.post('/checkout', requireOpenSession, posController.checkoutWithDebt);

// Pelunasan hutang
router.post('/settle-debt', posController.settleDebt);

// Get outstanding debts
router.get('/outstanding-debts', posController.getOutstandingDebts);

module.exports = router;
