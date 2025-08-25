const express = require('express');
const router = express.Router();
const multer = require('multer');
const purchasingController = require('../controllers/purchasingController');

// --- Multer pakai memoryStorage ---
const storage = multer.memoryStorage();
const upload = multer({
    storage
});

// --- Routes ---
// Render halaman utama purchasing
router.get('/', purchasingController.index);

// Data JSON untuk daftar purchasing (AJAX)
router.get('/listJSON', purchasingController.listJSON);

// Data JSON untuk daftar supplier (dropdown AJAX)
router.get('/suppliers', purchasingController.listSuppliersJSON);

// Halaman create
router.get('/create', purchasingController.createPage);

// Create purchasing (pakai multer untuk notaFile)
router.post('/create', upload.single('notaFile'), purchasingController.create);

// View detail purchasing
router.get('/view/:id', purchasingController.view);
router.post('/complete/:id', purchasingController.complete);
router.post('/cancel/:id', purchasingController.cancel);
router.post('/return/:id', purchasingController.return);
router.delete('/:id', purchasingController.delete);

module.exports = router;
