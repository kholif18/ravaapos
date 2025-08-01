const {
    Supplier
} = require('../models');
const {
    validationResult
} = require('express-validator');

exports.getAll = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
            order: [
                ['name', 'ASC']
            ]
        });
        res.render('suppliers/index', {
            suppliers,
            activePage: 'suppliers'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

exports.getAllJSON = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const {
            count,
            rows
        } = await Supplier.findAndCountAll({
            order: [
                ['name', 'ASC']
            ],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        res.json({
            data: rows,
            pagination: {
                page,
                limit,
                totalItems: count,
                totalPages
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat data supplier'
        });
    }
};

exports.create = async (req, res) => {
    const {
        name,
        phone,
        email,
        address,
        note
    } = req.body;
    try {
        await Supplier.create({
            name,
            phone,
            email,
            address,
            note
        });
        res.json({
            success: true,
            message: 'Supplier berhasil ditambahkan'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah supplier'
        });
    }
};

exports.update = async (req, res) => {
    const id = req.params.id;
    const {
        name,
        phone,
        email,
        address,
        note
    } = req.body;

    try {
        const supplier = await Supplier.findByPk(id);
        if (!supplier) return res.status(404).json({
            success: false,
            message: 'Supplier tidak ditemukan'
        });

        await supplier.update({
            name,
            phone,
            email,
            address,
            note
        });
        res.json({
            success: true,
            message: 'Supplier berhasil diperbarui'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui supplier'
        });
    }
};

exports.delete = async (req, res) => {
    const id = req.params.id;

    try {
        const supplier = await Supplier.findByPk(id);
        if (!supplier) return res.status(404).json({
            success: false,
            message: 'Supplier tidak ditemukan'
        });

        await supplier.destroy();
        res.json({
            success: true,
            message: 'Supplier berhasil dihapus'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus supplier'
        });
    }
};
