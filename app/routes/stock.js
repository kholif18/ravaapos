const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/', stockController.index);
router.get('/partial', stockController.getPartial);
router.get('/summary', stockController.getSummary);
router.post('/:id/add-stock', stockController.addStock);
router.post('/:id/adjust', stockController.adjustStock);
router.get('/history/:id', stockController.historyPage);

module.exports = router;