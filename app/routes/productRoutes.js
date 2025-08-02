const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage
});
const productController = require('../controllers/productController');

// Tampilkan halaman utama (EJS)
router.get('/', productController.viewProducts);

// Tambah product (non-AJAX)
router.post('/', upload.single('image'), productController.createProduct);

// API JSON untuk tabel/infinite scroll
router.get('/json', productController.getProductJson);

// Tambah stok
router.post('/:id/stock', productController.addStock);

// Update & Delete (AJAX)
router.post('/:id/update', productController.updateProduct);
router.post('/:id/delete', productController.destroy);

module.exports = router;
