const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Tampilkan halaman
router.get('/', customerController.getAll);

// Simpan customer baru
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', customerController.destroy);


module.exports = router;
