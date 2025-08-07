const {
    body
} = require('express-validator');
const {
    Supplier
} = require('../models');

exports.validateCreateSupplier = [
    body('code')
    .notEmpty().withMessage('Kode tidak boleh kosong')
    .custom(async code => {
        const exists = await Supplier.findOne({
            where: {
                code
            }
        });
        if (exists) throw new Error('Kode supplier sudah digunakan');
        return true;
    }),
    body('name').notEmpty().withMessage('Nama tidak boleh kosong'),
    body('email').optional({
        checkFalsy: true
    }).isEmail().withMessage('Email tidak valid'),
    body('postalCode').optional({
        checkFalsy: true
    }).isPostalCode('any').withMessage('Kode pos tidak valid')
];

exports.validateUpdateSupplier = [
    body('code')
    .notEmpty().withMessage('Kode tidak boleh kosong')
    .custom(async (code, {
        req
    }) => {
        const existing = await Supplier.findOne({
            where: {
                code,
                id: {
                    [Op.ne]: req.params.id
                }
            }
        });
        if (existing) throw new Error('Kode supplier sudah digunakan');
        return true;
    }),
    body('name').notEmpty().withMessage('Nama tidak boleh kosong'),
    body('email').optional({
        checkFalsy: true
    }).isEmail(),
    body('postalCode').optional({
        checkFalsy: true
    }).isPostalCode('any')
];
