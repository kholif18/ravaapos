// routes/pos.js
const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');

// GET POS page
router.get('/', posController.index);

// API Routes
router.get('/api/products/search', posController.searchProducts);
router.get('/api/products/favorite', posController.getFavoriteProducts);
router.get('/api/products/barcode/:barcode', posController.getProductByBarcode);
router.get('/api/customers/search', posController.searchCustomers);
router.get('/api/customers', posController.getCustomers);
router.post('/api/transaction', posController.saveTransaction);

module.exports = router;