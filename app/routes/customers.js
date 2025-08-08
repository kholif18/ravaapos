// routes/customers.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Halaman utama (render full page + modal)
router.get('/', customerController.getAll);

// Partial table (untuk AJAX pagination/filter/search)
router.get('/partial', customerController.getPartial);

// List untuk Select2 atau dropdown AJAX
router.get('/list', customerController.getListAJAX);

// CRUD
router.post('/', customerController.create);
router.post('/:id/update', customerController.update);
router.post('/:id/delete', customerController.destroy);

module.exports = router;
