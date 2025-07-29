const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

// View halaman utama item
router.get('/view', itemController.viewItems);

// Tambah item (non-AJAX)
router.post('/', itemController.createItem);

// API JSON untuk tabel/infinite scroll
router.get('/json', itemController.getItemJson);
router.get('/', itemController.getAllItems);

// Tambah stok
router.post('/:id/stock', itemController.addStock);

// Update & Delete (AJAX, opsional)
router.post('/:id/update', itemController.updateItem);
router.post('/:id/delete', itemController.deleteItem);

module.exports = router;
