// routes/customers.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const multer = require('multer');
const upload = multer({
    dest: 'tmp/'
});

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

router.get('/template-csv', customerController.downloadTemplate);
router.get('/export', customerController.exportCSV);
router.post(
    '/import-csv',
    (req, res, next) => {
        req.skipGlobalCsrf = true;
        next();
    },
    upload.single('csvFile'),
    customerController.importCSV
);

module.exports = router;
