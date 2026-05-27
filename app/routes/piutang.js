const express = require('express');
const router = express.Router();
const piutangController = require('../controllers/piutangController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, piutangController.getOutstandingDebts);
router.post('/settle', isAuthenticated, piutangController.settleDebt);
router.get('/history/:saleId', isAuthenticated, piutangController.debtHistory);

module.exports = router;
