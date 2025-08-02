const {
    Category,
    Product
} = require('../models');
const {
    fn,
    col
} = require('sequelize');
const {
    validationResult
} = require('express-validator');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Ambil semua kategori dengan jumlah product per kategori
        const {
            count,
            rows
        } = await Category.findAndCountAll({
            attributes: {
                include: [
                    [fn('COUNT', col('products.id')), 'productCount']
                ]
            },
            include: [{
                model: Product,
                as: 'products',
                attributes: []
            }],
            group: ['Category.id'],
            order: [
                ['name', 'ASC']
            ],
            limit,
            offset,
            subQuery: false
        });

        // Karena pakai GROUP BY, count adalah array. Kita hitung jumlah kategori dari count.length
        const totalItems = Array.isArray(count) ? count.length : count;
        const totalPages = Math.ceil(totalItems / limit);

        res.render('categories/index', {
            title: 'Categories',
            categories: rows,
            activePage: 'categories',
            pagination: {
                page,
                limit,
                totalProduct: totalItems,
                totalPages,
            },
        });
    } catch (err) {
        console.error('Error saat mengambil data kategori:', err);
        res.status(500).render('error', {
            message: 'Gagal memuat data kategori',
            error: err
        });
    }
};


// POST /categories
exports.create = async (req, res) => {
    try {
        const {
            name
        } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Nama tidak boleh kosong'
            });
        }

        const category = await Category.create({
            name
        });
        res.status(201).json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            category
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan kategori'
        });
    }
};

// POST /categories/:id/update
exports.update = async (req, res) => {
    try {
        const {
            id
        } = req.params;
        const {
            name
        } = req.body;

        const category = await Category.findByPk(id);
        if (!category) return res.status(404).json({
            success: false,
            message: 'Kategori tidak ditemukan'
        });

        category.name = name;
        await category.save();

        res.json({
            success: true,
            message: 'Kategori berhasil diupdate',
            category
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate kategori'
        });
    }
};

// POST /categories/:id/delete
exports.delete = async (req, res) => {
    try {
        const {
            id
        } = req.params;
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).json({
            success: false,
            message: 'Kategori tidak ditemukan'
        });

        await Product.update({
            categoryId: null
        }, {
            where: {
                categoryId: id
            }
        });
        await category.destroy();

        res.json({
            success: true,
            message: 'Kategori berhasil dihapus'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus kategori'
        });
    }
};

exports.getAllJson = async (req, res) => {
    try {
        const categories = await Category.findAll({
            attributes: {
                include: [
                    [fn('COUNT', col('products.id')), 'productCount']
                ]
            },
            include: {
                model: Product,
                as: 'products',
                attributes: []
            },
            group: ['Category.id'],
            order: [
                ['name', 'ASC']
            ]
        });

        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Gagal memuat kategori'
        });
    }
};

// GET /categories/partial
exports.getPartial = async (req, res) => {
    try {
        const categories = await Category.findAll({
            attributes: {
                include: [
                    [fn('COUNT', col('products.id')), 'productCount']
                ]
            },
            include: {
                model: Product,
                as: 'products',
                attributes: []
            },
            group: ['Category.id'],
            order: [
                ['name', 'ASC']
            ]
        });

        res.render('categories/_tbody', {
            categories,
            layout: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal memuat kategori');
    }
};
