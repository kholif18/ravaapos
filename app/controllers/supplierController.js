const db = require('../models');
const Supplier = db.Supplier;

/**
 * GET /suppliers (untuk render halaman HTML)
 */
exports.view = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
            order: [
                ['name', 'ASC']
            ]
        });

        res.render('suppliers/index', {
            title: 'Daftar Supplier',
            suppliers,
        });
    } catch (error) {
        res.status(500).send('Gagal memuat halaman supplier');
    }
};

/**
 * GET /suppliers/api (untuk fetch() AJAX)
 */
exports.getAll = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
            order: [
                ['name', 'ASC']
            ]
        });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({
            message: 'Gagal mengambil supplier',
            error: error.message,
        });
    }
};

/**
 * POST /suppliers
 */
exports.create = async (req, res) => {
    try {
        const supplier = await Supplier.create(req.body);
        res.status(201).json({
            message: 'Supplier berhasil ditambahkan',
            data: supplier,
        });
    } catch (error) {
        res.status(400).json({
            message: 'Gagal menambahkan supplier',
            error: error.message,
        });
    }
};

/**
 * PUT /suppliers/:id
 */
exports.update = async (req, res) => {
    try {
        const updated = await Supplier.update(req.body, {
            where: {
                id: req.params.id
            },
        });

        if (updated[0] === 0) {
            return res.status(404).json({
                message: 'Supplier tidak ditemukan'
            });
        }

        res.json({
            message: 'Supplier berhasil diperbarui'
        });
    } catch (error) {
        res.status(400).json({
            message: 'Gagal memperbarui supplier',
            error: error.message,
        });
    }
};

/**
 * DELETE /suppliers/:id
 */
exports.remove = async (req, res) => {
    try {
        const deleted = await Supplier.destroy({
            where: {
                id: req.params.id
            },
        });

        if (!deleted) {
            return res.status(404).json({
                message: 'Supplier tidak ditemukan'
            });
        }

        res.json({
            message: 'Supplier berhasil dihapus'
        });
    } catch (error) {
        res.status(400).json({
            message: 'Gagal menghapus supplier',
            error: error.message,
        });
    }
};
