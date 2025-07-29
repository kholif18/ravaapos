const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const {
    body
} = require('express-validator');

// Menampilkan daftar kategori
router.get('/', categoryController.getAll);

// Menambahkan kategori
router.post(
    '/',
    body('name').notEmpty().withMessage('Nama kategori wajib diisi'),
    categoryController.create
);

// Mengupdate kategori
router.post('/:id/update', categoryController.update);

// Menghapus kategori
router.post('/:id/delete', categoryController.delete);

module.exports = router;
