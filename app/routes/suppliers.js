const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const multer = require('multer');
const upload = multer({
    dest: 'uploads/'
});

const {
    validateCreateSupplier,
    validateUpdateSupplier
} = require('../validators/supplierValidator');

const {
    validationResult
} = require('express-validator');

// Middleware untuk handle error validasi
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// GET halaman utama supplier
router.get('/', supplierController.getAll);

// Partial view untuk tabel supplier (AJAX)
router.get('/partial', supplierController.getPartial);

// API JSON supplier list (opsional)
router.get('/json', supplierController.getAllJSON);

// GET API generate kode supplier
router.get('/generate-code', supplierController.generateSupplierCode);

// GET API check kode unik
router.get('/check-code', supplierController.checkCode);

router.get('/export-csv', supplierController.exportCSV);

// POST create supplier (pakai validasi)
router.post('/', validateCreateSupplier, handleValidation, supplierController.create);

// POST update supplier (pakai validasi)
router.post('/:id/update', validateUpdateSupplier, handleValidation, supplierController.update);

// POST delete supplier
router.post('/:id/delete', supplierController.delete);

router.post(
    '/import-csv',
    (req, res, next) => {
        req.skipGlobalCsrf = true;
        next();
    },
    upload.single('csv'),
    supplierController.importCSV
);

// GET /suppliers/:id/json
router.get('/:id/json', supplierController.getByIdJSON);

router.get('/:id/detail', supplierController.getDetail);

router.get('/template-csv', supplierController.downloadTemplate);

module.exports = router;
