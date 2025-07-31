const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

// Tampilkan halaman utama (EJS)
router.get('/', itemController.viewItems);

// Tambah item (non-AJAX)
router.post('/', itemController.createItem);

// API JSON untuk tabel/infinite scroll
router.get('/json', itemController.getItemJson);

// Tambah stok
router.post('/:id/stock', itemController.addStock);

// Update & Delete (AJAX)
router.post('/:id/update', itemController.updateItem);
router.post('/:id/delete', itemController.deleteItem);

module.exports = router;
