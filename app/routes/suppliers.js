const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

// View
router.get('/', supplierController.view);

// API endpoints
router.get('/api', supplierController.getAll);
router.post('/', supplierController.create);
router.put('/:id', supplierController.update);
router.delete('/:id', supplierController.remove);

module.exports = router;
