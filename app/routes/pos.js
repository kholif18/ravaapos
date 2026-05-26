// routes/posRoutes.js
const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');

// GET routes
router.get('/', posController.index);
router.get('/search', posController.searchProducts);
router.get('/favorites', posController.getFavoriteProducts);
router.get('/customers', posController.getCustomers);
router.get('/next-invoice', posController.getNextInvoiceNumber);
router.get('/transaction-history', posController.getTransactionHistory);
router.get('/daily-report', posController.getDailySalesReport);
router.get('/debug', posController.debug);

// POST routes
router.post('/save-transaction', posController.saveTransaction);
router.post('/apply-promo', posController.applyPromo);
router.post('/void-transaction', posController.voidTransaction);

// GET with params
router.get('/product/:barcode', posController.getProductByBarcode);
router.get('/search-customers', posController.searchCustomers);

module.exports = router;
