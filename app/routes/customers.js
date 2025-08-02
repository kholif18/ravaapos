const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Tampilkan halaman
router.get('/', customerController.getAll);

// Simpan customer baru
router.post('/', customerController.create);
router.post('/:id/update', customerController.update);
router.post('/:id/delete', customerController.destroy);
router.get('/json', customerController.getJson);
router.get('/list', customerController.getListAJAX);

module.exports = router;
