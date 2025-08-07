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
            errors: errors.mapped()
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

// POST create supplier (pakai validasi)
router.post('/', validateCreateSupplier, handleValidation, supplierController.create);

// POST update supplier (pakai validasi)
router.post('/:id/update', validateUpdateSupplier, handleValidation, supplierController.update);

// GET /suppliers/:id/json
router.get('/:id/json', supplierController.getByIdJSON);

// POST delete supplier
router.post('/:id/delete', supplierController.delete);

router.get('/:id/detail', supplierController.getDetail);
router.get('/export-csv', supplierController.exportCSV);

router.post('/import-csv', upload.single('csv'), supplierController.importCSV);
router.get('/template-csv', supplierController.downloadTemplate);

module.exports = router;
