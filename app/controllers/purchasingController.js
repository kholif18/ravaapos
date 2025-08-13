const {
    Purchasing,
    Supplier,
    Product,
    PurchasingItem
} = require('../models');
const {
    Op
} = require('sequelize');

// Halaman utama
exports.index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const {
        count,
        rows
    } = await Purchasing.findAndCountAll({
        include: [Supplier],
        order: [
            ['date', 'DESC']
        ],
        limit,
        offset
    });

    res.render('purchasing/index', {
        purchasings: rows,
        pagination: {
            page,
            limit,
            totalItems: count,
            totalPages: Math.ceil(count / limit)
        },
        activePage: 'purchasing'
    });
};

exports.createPage = (req, res) => {
    res.render('purchasing/create', {
        csrfToken: req.csrfToken(),
        activePage: 'purchasing'
    });
};

// Data JSON untuk AJAX
exports.list = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const {
        count,
        rows
    } = await Purchasing.findAndCountAll({
        include: [Supplier],
        order: [
            ['date', 'DESC']
        ],
        limit,
        offset
    });

    const data = rows.map(p => ({
        id: p.id,
        date: p.date,
        dateFormatted: p.date.toLocaleDateString(),
        supplierName: p.Supplier.name,
        total: p.total,
        status: p.status
    }));

    res.json({
        data,
        total: count
    });
};

exports.listJSON = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
            attributes: ['id', 'name'],
            order: [
                ['name', 'ASC']
            ]
        });
        res.json(suppliers);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal load suppliers'
        });
    }
};

// Create purchasing
exports.create = async (req, res) => {
    try {
        const {
            supplierId,
            items
        } = req.body;
        if (!items || !items.length) {
            return res.status(400).json({
                success: false,
                message: 'Tambahkan minimal 1 item'
            });
        }

        // Hitung total
        const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

        const purchasing = await Purchasing.create({
            supplierId,
            total,
            date: new Date(),
            status: 'draft'
        });

        // Tambahkan item
        const purchasingItems = items.map(i => ({
            purchasingId: purchasing.id,
            productId: i.productId,
            qty: i.qty,
            price: i.price
        }));
        await PurchasingItem.bulkCreate(purchasingItems);

        res.json({
            success: true,
            message: 'Purchasing berhasil dibuat'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

exports.view = async (req, res) => {
    try {
        const purchasing = await Purchasing.findByPk(req.params.id, {
            include: [{
                    model: Supplier
                },
                {
                    model: PurchasingItem,
                    include: [Product]
                }
            ]
        });

        if (!purchasing) {
            return res.status(404).json({
                success: false,
                message: 'Purchasing tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: purchasing
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Partial pagination untuk AJAX
exports.renderPagination = async (req, res) => {
    try {
        const {
            pagination
        } = req.body;
        if (!pagination) return res.status(400).send('Pagination data required');

        // Render partial EJS pagination
        res.render('partials/pagination', {
            pagination
        }, (err, html) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error rendering pagination');
            }
            res.send(html);
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};
