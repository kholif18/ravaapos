const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

// GET halaman utama supplier
router.get('/', supplierController.getAll);

// API JSON list supplier
router.get('/json', supplierController.getAllJSON);

// POST tambah supplier
router.post('/', supplierController.create);

// POST update supplier
router.post('/:id/update', supplierController.update);

// POST hapus supplier
router.post('/:id/delete', supplierController.delete);

module.exports = router;
