const express = require('express');
const {
  body
} = require('express-validator');
const router = express.Router();
const itemController = require('../controllers/itemController');

// ==========================
//         VIEW
// ==========================
router.get('/view', itemController.viewItems); // Halaman untuk menampilkan daftar item

// ==========================
//          API
// ==========================

// Tambah item baru
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isNumeric().withMessage('Price must be a number')
  ],
  itemController.createItem
);

// Ambil semua item (JSON)
router.get('/', itemController.getAllItems);

router.get('/create', (req, res) => {
  res.render('items/create', {
    title: 'Tambah Item'
  });
});

// Tambah stok
router.post('/:id/stock', itemController.addStock);

module.exports = router;
