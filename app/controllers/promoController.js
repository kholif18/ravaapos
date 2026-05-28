// controllers/promoController.js
const {
    Promo,
    Category,
    Product
} = require('../models');
const {
    Op
} = require('sequelize');
const json2csv = require('json2csv').parse;
const fs = require('fs');
const path = require('path');

exports.index = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let whereCondition = {};
        if (search) {
            whereCondition = {
                [Op.or]: [{
                        name: {
                            [Op.like]: `%${search}%`
                        }
                    },
                    {
                        code: {
                            [Op.like]: `%${search}%`
                        }
                    }
                ]
            };
        }

        const {
            count,
            rows: promos
        } = await Promo.findAndCountAll({
            where: whereCondition,
            include: [{
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'code']
                }
            ],
            order: [
                ['createdAt', 'DESC']
            ],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        const categories = await Category.findAll({
            attributes: ['id', 'name'],
            order: [
                ['name', 'ASC']
            ]
        });

        const products = await Product.findAll({
            attributes: ['id', 'name', 'code', 'barcode'],
            order: [
                ['name', 'ASC']
            ],
            limit: 500
        });

        // Langsung render, jangan redirect
        return res.render('promo/index', {
            title: 'Promo Management',
            activePage: 'promo',
            promos,
            categories,
            products,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: count,
                limit: limit,
                offset: offset,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                prevPage: page - 1,
                nextPage: page + 1,
                search: search
            },
            csrfToken: req.csrfToken ? req.csrfToken() : '',
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Index error:', error);
        // Jangan redirect ke /promo lagi, tapi render dengan error
        return res.render('promo/index', {
            title: 'Promo Management',
            promos: [],
            categories: [],
            products: [],
            pagination: null,
            csrfToken: req.csrfToken ? req.csrfToken() : '',
            success: null,
            error: 'Gagal memuat data promo: ' + error.message
        });
    }
};

// Helper function untuk cek AJAX request
const isAjaxRequest = (req) => {
    return req.xhr || 
           req.headers['content-type'] === 'application/json' ||
           req.headers.accept?.includes('application/json') ||
           req.headers['x-requested-with'] === 'XMLHttpRequest';
};

const formatDate = (dateString) => {
    if (!dateString) return null;
    // Format: YYYY-MM-DDThh:mm -> YYYY-MM-DD HH:mm:00
    return dateString.replace('T', ' ') + ':00';
};
exports.create = async (req, res) => {
    try {
        // Log untuk debugging
        console.log('Create promo - body:', req.body);
        console.log('Is AJAX?', isAjaxRequest(req));

        // Validasi input
        const {
            name,
            code,
            type,
            value,
            minTransaction,
            maxDiscount,
            usageLimit,
            startDate,
            expiredAt,
            description,
            applyType, 
            categoryId, 
            productId
        } = req.body;

        if (!name || !code || !type || !value) {
            const errorMsg = 'Nama, kode, tipe, dan nilai diskon wajib diisi';
            if (isAjaxRequest(req)) {
                return res.json({
                    success: false,
                    message: errorMsg
                });
            }
            req.flash('error', errorMsg);
            return res.redirect('/promo');
        }

        if (applyType === 'category' && !categoryId) {
            return res.json({
                success: false,
                message: 'Silakan pilih kategori untuk promo ini'
            });
        }

        if (applyType === 'product' && !productId) {
            return res.json({
                success: false,
                message: 'Silakan pilih produk untuk promo ini'
            });
        }

        // Cek duplicate code
        const existing = await Promo.findOne({
            where: {
                code: code.toUpperCase()
            }
        });
        if (existing) {
            if (isAjaxRequest(req)) {
                return res.json({
                    success: false,
                    message: 'Kode promo sudah ada',
                    codeError: true
                });
            }
            req.flash('error', 'Kode promo sudah ada');
            return res.redirect('/promo');
        }

        // Format tanggal
        const formattedStartDate = formatDate(startDate);
        const formattedExpiredAt = formatDate(expiredAt);

        // Create promo
        const newPromo = await Promo.create({
            name: name,
            code: code.toUpperCase(),
            type: type,
            value: parseFloat(value),
            minTransaction: parseFloat(minTransaction) || 0,
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            startDate: startDate || null,
            expiredAt: expiredAt || null,
            description: description || null,
            applyType: applyType || 'all',
            categoryId: applyType === 'category' ? (parseInt(categoryId, 10) || null) : null,
            productId: applyType === 'product' ? (parseInt(productId, 10) || null) : null,
            isActive: true
        });

        console.log('Promo created:', newPromo.toJSON());

        if (isAjaxRequest(req)) {
            return res.json({
                success: true,
                message: 'Promo berhasil dibuat',
                data: newPromo
            });
        }

        req.flash('success', 'Promo berhasil dibuat');
        res.redirect('/promo');
    } catch (err) {
        console.error('Create promo error:', err);

        // Handle validation error dari database
        let errorMessage = err.message;
        if (err.name === 'SequelizeValidationError') {
            errorMessage = err.errors.map(e => e.message).join(', ');
        } else if (err.name === 'SequelizeUniqueConstraintError') {
            errorMessage = 'Kode promo sudah digunakan';
        }

        if (isAjaxRequest(req)) {
            return res.json({
                success: false,
                message: errorMessage
            });
        }
        req.flash('error', errorMessage);
        res.redirect('/promo');
    }
};

exports.update = async (req, res) => {
    try {
        const promo = await Promo.findByPk(req.params.id);

        if (!promo) {
            return res.status(404).json({
                success: false,
                message: 'Promo tidak ditemukan'
            });
        }

        // Validasi untuk update
        const {
            name,
            type,
            value,
            minTransaction,
            maxDiscount,
            usageLimit,
            startDate,
            expiredAt,
            description,
            applyType, 
            categoryId, 
            productId
        } = req.body;

        if (!name || !type || !value) {
            return res.json({
                success: false,
                message: 'Nama, tipe, dan nilai diskon wajib diisi'
            });
        }

        if (applyType === 'category' && !categoryId) {
            return res.json({
                success: false,
                message: 'Silakan pilih kategori untuk promo ini'
            });
        }

        if (applyType === 'product' && !productId) {
            return res.json({
                success: false,
                message: 'Silakan pilih produk untuk promo ini'
            });
        }

        const formattedStartDate = formatDate(startDate);
        const formattedExpiredAt = formatDate(expiredAt);

        await promo.update({
            name: name,
            type: type,
            value: parseFloat(value),
            minTransaction: parseFloat(minTransaction) || 0,
            maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
            usageLimit: usageLimit ? parseInt(usageLimit) : null,
            startDate: startDate || null,
            expiredAt: expiredAt || null,
            description: description || null,
            applyType: applyType || 'all',
            categoryId: applyType === 'category' ? (parseInt(categoryId, 10) || null) : null,
            productId: applyType === 'product' ? (parseInt(productId, 10) || null) : null
        });

        res.json({
            success: true,
            message: 'Promo berhasil diupdate'
        });
    } catch (err) {
        console.error('Update promo error:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.destroy = async (req, res) => {
    try {
        const promo = await Promo.findByPk(req.params.id);

        if (!promo) {
            return res.status(404).json({
                success: false,
                message: 'Promo tidak ditemukan'
            });
        }

        await promo.destroy();

        res.json({
            success: true,
            message: 'Promo berhasil dihapus'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.toggleStatus = async (req, res) => {
    try {
        const promo = await Promo.findByPk(req.params.id);

        if (!promo) {
            return res.status(404).json({
                success: false,
                message: 'Promo tidak ditemukan'
            });
        }

        await promo.update({
            isActive: req.body.isActive
        });
        res.json({
            success: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.export = async (req, res) => {
    try {
        const promos = await Promo.findAll({
            order: [
                ['createdAt', 'DESC']
            ]
        });

        const fields = ['code', 'name', 'type', 'value', 'minTransaction', 'maxDiscount', 'usageLimit', 'usedCount', 'startDate', 'expiredAt', 'isActive', 'description'];
        const opts = {
            fields
        };
        const csv = json2csv(promos.map(p => p.toJSON()), opts);

        res.header('Content-Type', 'text/csv');
        res.attachment('promos.csv');
        res.send(csv);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Gagal export data');
        res.redirect('/promo');
    }
};

exports.downloadTemplate = async (req, res) => {
    const template = 'name,code,type,value,minTransaction,maxDiscount,usageLimit,startDate,expiredAt,description\n';
    res.header('Content-Type', 'text/csv');
    res.attachment('promo_template.csv');
    res.send(template);
};

exports.import = async (req, res) => {
    try {
        if (!req.file) {
            req.flash('error', 'File tidak ditemukan');
            return res.redirect('/promo');
        }

        const csv = req.file.buffer.toString();
        const lines = csv.split('\n').slice(1);
        let successCount = 0;
        let errorCount = 0;

        for (const line of lines) {
            if (!line.trim()) continue;
            const [name, code, type, value, minTransaction, maxDiscount, usageLimit, startDate, expiredAt, description] = line.split(',');

            if (!name || !code || !type || !value) continue;

            try {
                await Promo.create({
                    name: name.trim(),
                    code: code.trim().toUpperCase(),
                    type: type.trim(),
                    value: parseFloat(value),
                    minTransaction: parseFloat(minTransaction) || 0,
                    maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                    usageLimit: usageLimit ? parseInt(usageLimit) : null,
                    startDate: startDate || null,
                    expiredAt: expiredAt || null,
                    description: description || null,
                    isActive: true
                });
                successCount++;
            } catch (err) {
                errorCount++;
                console.error('Import error:', err.message);
            }
        }

        req.flash('success', `Import selesai: ${successCount} berhasil, ${errorCount} gagal`);
        res.redirect('/promo');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Gagal import data');
        res.redirect('/promo');
    }
};
