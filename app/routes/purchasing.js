const express = require('express');
const router = express.Router();
const purchasingController = require('../controllers/purchasingController');

// Halaman utama purchasing
router.get('/', purchasingController.index);

// Data JSON untuk daftar purchasing (AJAX)
router.get('/list', purchasingController.list);

// Data JSON untuk daftar supplier (untuk dropdown AJAX)
router.get('/suppliers', purchasingController.listJSON);

// Create purchasing
router.post('/create', purchasingController.create);

// View detail purchasing
router.get('/view/:id', purchasingController.view);

// Partial pagination (opsional, kalau mau render pagination via fetch)
router.post('/partials/pagination', purchasingController.renderPagination);

router.get('/create', purchasingController.createPage);
router.post('/create', purchasingController.create);

module.exports = router;
