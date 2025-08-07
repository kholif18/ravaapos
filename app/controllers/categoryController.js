const {
    Category,
    Product
} = require('../models');
const {
    fn,
    col,
    Op
} = require('sequelize');
const {
    getPaginationParams
} = require('../helpers/pagination');

// GET /categories
exports.getAll = async (req, res) => {
    try {
        const totalItems = await Category.count();

        const {
            page,
            limit,
            offset,
            totalPages
        } = getPaginationParams(req.query.page, req.query.limit, totalItems);

        // Ambil data kategori (dengan grouping produk)
        const rows = await Category.findAll({
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
            ],
            limit,
            offset,
            subQuery: false
        });

        res.render('categories/index', {
            title: 'Categories',
            categories: rows,
            activePage: 'categories',
            pagination: {
                page,
                limit,
                totalItems,
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
    const {
        name,
        prefix
    } = req.body;
    const cleanedPrefix = prefix?.trim().toUpperCase();

    if (!name?.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Nama tidak boleh kosong'
        });
    }

    if (!cleanedPrefix || !/^[A-Z]{2,5}$/.test(cleanedPrefix)) {
        return res.status(400).json({
            success: false,
            message: 'Prefix harus 2-5 huruf kapital'
        });
    }

    try {
        const category = await Category.create({
            name: name.trim(),
            prefix: cleanedPrefix
        });

        return res.status(201).json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            category
        });
    } catch (err) {
        console.error('Gagal menambahkan kategori:', err);
        return res.status(500).json({
            success: false,
            message: 'Gagal menambahkan kategori'
        });
    }
};

// POST /categories/:id/update
exports.update = async (req, res) => {
    const {
        id
    } = req.params;
    const {
        name,
        prefix
    } = req.body;
    const cleanedPrefix = prefix?.trim().toUpperCase();

    if (!name?.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Nama tidak boleh kosong'
        });
    }

    if (!cleanedPrefix || !/^[A-Z]{2,5}$/.test(cleanedPrefix)) {
        return res.status(400).json({
            success: false,
            message: 'Prefix harus 2-5 huruf kapital'
        });
    }

    try {
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        category.name = name.trim();
        category.prefix = cleanedPrefix;
        await category.save();

        res.json({
            success: true,
            message: 'Kategori berhasil diupdate',
            category
        });
    } catch (err) {
        console.error('Gagal mengupdate kategori:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate kategori'
        });
    }
};

// POST /categories/:id/delete
exports.delete = async (req, res) => {
    const {
        id
    } = req.params;

    try {
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

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
        console.error('Gagal menghapus kategori:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus kategori'
        });
    }
};

// GET /categories/partial
exports.getPartial = async (req, res) => {
    try {
        const search = req.query.search?.trim();
        const sort = req.query.sort || 'name';
        const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

        const where = search ?
            {
                name: {
                    [Op.like]: `%${search}%`
                }
            } :
            {};

        // Hitung total item
        const totalItems = await Category.count({
            where
        });

        const {
            page,
            limit,
            offset,
            totalPages
        } = getPaginationParams(req.query.page, req.query.limit, totalItems);

        // Ambil data kategori dengan join + group
        const rows = await Category.findAll({
            where,
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
                [sort, order]
            ],
            limit,
            offset,
            subQuery: false
        });

        res.render('categories/_partial', {
            categories: rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                sort,
                order,
            },
            layout: false
        });
    } catch (err) {
        console.error('Gagal memuat kategori partial:', err);
        res.status(500).send('Gagal memuat kategori');
    }
};

// GET /categories/search?search=...
exports.searchAjax = async (req, res) => {
    const {
        search
    } = req.query;
    const where = search ?
        {
            name: {
                [Op.like]: `%${search}%`
            }
        } :
        {};

    try {
        const categories = await Category.findAll({
            where,
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
        console.error('Gagal mencari kategori:', err);
        res.status(500).send('Gagal mencari kategori');
    }
};
