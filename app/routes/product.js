const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
    storage
});
const productController = require('../controllers/productController');
const barcodeController = require('../controllers/barcodeController');

// Tampilkan halaman utama (EJS)
router.get('/', productController.viewProducts);

// Tambah product (non-AJAX)
router.post('/', upload.single('image'), productController.createProduct);
router.get('/generate-code', productController.generateProductCode);

// API JSON untuk tabel/infinite scroll
router.get('/json', productController.getProductJson);

// Update & Delete (AJAX)
router.post('/:id/update', upload.single('image'), productController.updateProduct);
router.post('/:id/delete', productController.destroy);
router.get('/json/:id', productController.getProductById);
router.put('/:id', upload.single('image'), productController.updateProduct);

router.get('/barcode', barcodeController.index);

router.get('/import/template', productController.downloadTemplateCSV);
router.post(
    '/import-csv',
    (req, res, next) => {
        req.skipGlobalCsrf = true; // kasih flag biar CSRF dilewati
        next();
    },
    upload.single('csvFile'), // pastikan sama dengan name di form
    productController.importCSV
);

router.get('/export/csv', productController.exportCSV);
router.get('/export/pdf', productController.exportPDF);
router.get('/print', productController.printProducts);

router.get('/search', productController.searchJSON);

module.exports = router;
