const {
    Purchasing,
    Supplier,
    Product,
    PurchasingItem
} = require('../models');
const path = require('path');
const fs = require('fs');
const {
    recordStockHistory
} = require('../helpers/recordStockHistory');

// Helper untuk ambil data purchasing + pagination
async function fetchPurchasingData(page, limit) {
    const offset = (page - 1) * limit;
    const {
        count,
        rows
    } = await Purchasing.findAndCountAll({
        include: [{
                model: Supplier,
                as: 'supplier',
                attributes: ['name']
            },
            {
                model: PurchasingItem,
                as: 'items',
                include: {
                    model: Product,
                    as: 'product',
                    attributes: ['name']
                }
            }
        ],
        order: [
            ['date', 'DESC']
        ],
        limit,
        offset
    });

    return {
        purchasings: rows,
        pagination: {
            page,
            limit,
            totalPages: Math.ceil(count / limit),
            totalItems: count
        }
    };
}

// Halaman utama (table akan di-load via AJAX)
exports.index = (req, res) => {
    res.render('purchasing/index', {
        title: 'Purchasing',
        activePage: 'purchasing',
        purchasings: [],
        pagination: {
            page: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0
        }
    });
};

// Halaman create
exports.createPage = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
            order: [
                ['name', 'ASC']
            ]
        });
        res.render('purchasing/create', {
            title: 'Buat Purchasing',
            activePage: 'purchasing',
            csrfToken: req.csrfToken(),
            suppliers
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            message: 'Gagal load halaman create',
            error: err,
            activePage: 'purchasing'
        });
    }
};

// JSON untuk AJAX reload table
exports.listJSON = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const {
            count,
            rows
        } = await Purchasing.findAndCountAll({
            include: [{
                    model: Supplier,
                    as: 'supplier',
                    attributes: ['name']
                },
                {
                    model: PurchasingItem,
                    as: 'items',
                    include: {
                        model: Product,
                        as: 'product',
                        attributes: ['name']
                    }
                }
            ],
            order: [
                ['date', 'DESC']
            ],
            limit,
            offset
        });

        const totalPages = Math.ceil(count / limit);

        res.json({
            success: true,
            purchasings: rows,
            pagination: {
                page,
                limit,
                totalPages,
                totalItems: count
            }
        });
    } catch (err) {
        console.error('Error load purchasing:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal load data purchasing'
        });
    }
};

// JSON daftar supplier untuk dropdown AJAX
exports.listSuppliersJSON = async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
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

// list partial untuk AJAX reload
exports.listPartial = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search?.trim() || '';
        const supplier = req.query.supplier || '';
        const status = req.query.status || '';

        const where = {};

        if (search) {
            where[Op.or] = [{
                    '$supplier.name$': {
                        [Op.like]: `%${search}%`
                    }
                },
                {
                    id: {
                        [Op.like]: `%${search}%`
                    }
                }
            ];
        }

        if (supplier) {
            where.supplierId = supplier;
        }

        if (status) {
            where.status = status;
        }

        const {
            count,
            rows
        } = await Purchasing.findAndCountAll({
            where,
            include: [{
                model: Supplier,
                as: 'supplier',
                required: false // biar data muncul walau supplier null
            }],
            order: [
                ['date', 'DESC']
            ],
            limit,
            offset: (page - 1) * limit
        });

        const totalPages = Math.max(1, Math.ceil(count / limit));

        const pagination = {
            page,
            limit,
            total: count,
            pages: totalPages
        };

        if (req.xhr) {
            return res.render('purchasing/_tbody', {
                layout: false,
                purchasings: rows,
                pagination,
                activePage: page,
                limit
            });
        }

        res.render('purchasing/index', {
            purchasings: rows,
            pagination,
            activePage: page,
            limit
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Terjadi kesalahan server');
    }
};

// Create purchasing (draft)
exports.create = async (req, res) => {
    try {
        const {
            supplierId,
            items
        } = req.body;
        const itemsParsed = JSON.parse(items || '[]');

        if (!itemsParsed.length)
            return res.status(400).json({
                success: false,
                message: 'Tambahkan minimal 1 item'
            });

        const total = itemsParsed.reduce((sum, i) => sum + (i.qty || 0) * (i.price || 0), 0);

        let notaFilePath = null;
        if (req.file) {
            notaFilePath = `/uploads/notas/${req.file.filename}`;
        }

        // Buat draft purchasing
        const purchasing = await Purchasing.create({
            supplierId,
            total,
            date: new Date(),
            status: 'draft', // draft dulu
            notaFile: notaFilePath
        });

        const purchasingItems = itemsParsed.map(i => ({
            purchasingId: purchasing.id,
            productId: i.productId,
            qty: i.qty,
            price: i.price
        }));
        await PurchasingItem.bulkCreate(purchasingItems);

        res.json({
            success: true,
            message: 'Purchasing berhasil dibuat',
            purchasingId: purchasing.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Complete purchasing & update stock
exports.complete = async (req, res) => {
    try {
        const purchasing = await Purchasing.findByPk(req.params.id, {
            include: [{
                model: PurchasingItem,
                as: 'items'
            }]
        });
        if (!purchasing) return res.status(404).json({
            success: false,
            message: 'Purchasing tidak ditemukan'
        });
        if (purchasing.status !== 'draft') return res.status(400).json({
            success: false,
            message: 'Purchasing sudah selesai'
        });

        for (const item of purchasing.items) {
            const product = await Product.findByPk(item.productId);
            if (product) {
                const oldStock = product.stock || 0;
                product.stock = oldStock + item.qty;
                await product.save();

                await recordStockHistory({
                    productId: product.id,
                    type: 'purchase',
                    qty: item.qty,
                    note: `Pembelian #${purchasing.id}`,
                    createdBy: req.user?.name || 'admin'
                });
            }
        }

        purchasing.status = 'completed';
        await purchasing.save();

        res.json({
            success: true,
            message: 'Purchasing selesai & stok diperbarui'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Cancel purchasing
exports.cancel = async (req, res) => {
    try {
        const purchasing = await Purchasing.findByPk(req.params.id, {
            include: [{
                model: PurchasingItem,
                as: 'items'
            }]
        });
        if (!purchasing) return res.status(404).json({
            success: false,
            message: 'Purchasing tidak ditemukan'
        });
        if (purchasing.status === 'cancelled') return res.status(400).json({
            success: false,
            message: 'Purchasing sudah dibatalkan'
        });

        if (purchasing.status === 'completed') {
            for (const item of purchasing.items) {
                const product = await Product.findByPk(item.productId);
                if (product) {
                    const oldStock = product.stock || 0;
                    product.stock = oldStock - item.qty;
                    await product.save();

                    await recordStockHistory({
                        productId: product.id,
                        type: 'cancel',
                        qty: -item.qty,
                        note: `Pembatalan Pembelian #${purchasing.id}`,
                        createdBy: req.user?.name || 'admin'
                    });
                }
            }
        }

        purchasing.status = 'cancelled';
        await purchasing.save();

        res.json({
            success: true,
            message: 'Purchasing dibatalkan'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Return purchasing items
exports.return = async (req, res) => {
    try {
        const {
            items
        } = req.body; // [{productId, qty}]
        const purchasing = await Purchasing.findByPk(req.params.id);
        if (!purchasing) return res.status(404).json({
            success: false,
            message: 'Purchasing tidak ditemukan'
        });

        for (const i of items) {
            const product = await Product.findByPk(i.productId);
            if (product) {
                const oldStock = product.stock || 0;
                product.stock = oldStock - i.qty;
                await product.save();

                await recordStockHistory({
                    productId: product.id,
                    type: 'return',
                    qty: -i.qty,
                    note: `Pengembalian Pembelian #${purchasing.id}`,
                    createdBy: req.user?.name || 'admin'
                });
            }
        }

        res.json({
            success: true,
            message: 'Barang dikembalikan & stok diperbarui'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// View detail purchasing
exports.view = async (req, res) => {
    try {
        const purchasing = await Purchasing.findByPk(req.params.id, {
            include: [{
                    model: Supplier,
                    as: 'supplier'
                },
                {
                    model: PurchasingItem,
                    as: 'items',
                    include: {
                        model: Product,
                        as: 'product'
                    }
                }
            ]
        });
        if (!purchasing) return res.status(404).json({
            success: false,
            message: 'Purchasing tidak ditemukan'
        });

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
