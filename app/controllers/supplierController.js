const { name } = require('ejs');
const {
    Supplier,
    sequelize
} = require('../models');
const {
    validationResult
} = require('express-validator');
const {Op} = require('sequelize');

exports.getAll = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const where = search ? {
        name: {
            [Op.like]: `%${search}%`
        }
    } : {};

    try {
        const {
            count,
            rows
        } = await Supplier.findAndCountAll({
            where,
            order: [
                ['name', 'ASC']
            ],
            limit,
            offset,
        });

        const totalPages = Math.ceil(count / limit);

        res.render('suppliers/index', {
            title: 'Suppliers',
            activePage: 'suppliers',
            suppliers: rows,
            pagination: {
                page,
                limit,
                totalItems: count,
                totalPages,
                search
            }
        });
    } catch (err) {
        console.error('Gagal memuat data supplier:', err);
        res.status(500).render('error', {
            message: 'Gagal memuat supplier',
            error: err
        });
    }
};

exports.getAllJSON = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    try {
        const where = search ?
            {
                name: {
                    [Op.like]: `%${search}%`
                }
            } :
            {};

        const {
            count,
            rows
        } = await Supplier.findAndCountAll({
            where,
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

exports.getPartial = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    try {
        const where = search ?
            {
                name: {
                    [Op.like]: `%${search}%`
                }
            } :
            {};

        const {
            rows
        } = await Supplier.findAndCountAll({
            where,
            order: [
                ['name', 'ASC']
            ],
            limit,
            offset
        });

        res.render('suppliers/_tbody', {
            layout: false,
            suppliers: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal memuat data');
    }
};
