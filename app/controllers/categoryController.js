const {
    Category,
    Item
} = require('../models');
const {
    validationResult
} = require('express-validator');

// GET /categories
exports.getAll = async (req, res) => {
    try {
        const categories = await Category.findAll({
            order: [
                ['name', 'ASC']
            ]
        });
        res.render('categories/index', {
            title: 'Daftar Category',
            categories
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal memuat kategori');
    }
};

// POST /categories
exports.create = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    try {
        const {
            name
        } = req.body;
        await Category.create({
            name
        });
        res.redirect('/categories');
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal menambahkan kategori');
    }
};

// POST /categories/:id/update
exports.update = async (req, res) => {
    const {
        id
    } = req.params;
    const {
        name
    } = req.body;

    try {
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).send('Kategori tidak ditemukan');

        category.name = name;
        await category.save();
        res.redirect('/categories');
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal mengupdate kategori');
    }
};

// POST /categories/:id/delete
exports.delete = async (req, res) => {
    const {
        id
    } = req.params;

    try {
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).send('Kategori tidak ditemukan');

        // Optional: Null-kan kategori pada Item yang menggunakan kategori ini
        await Item.update({
            categoryId: null
        }, {
            where: {
                categoryId: id
            }
        });

        await category.destroy();
        res.redirect('/categories');
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal menghapus kategori');
    }
};

exports.getAllJson = async (req, res) => {
    const categories = await Category.findAll({
        order: [
            ['name', 'ASC']
        ]
    });
    res.json(categories);
};