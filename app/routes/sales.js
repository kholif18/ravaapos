const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// GET all sales
router.get('/', salesController.index);

// GET single sale detail (JSON)
router.get('/:id', salesController.getDetail);

// POST void sale
router.post('/void/:id', salesController.voidSale);

module.exports = router;