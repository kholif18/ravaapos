const {
    Purchasing,
    Supplier,
    Product,
    PurchasingItem,
    StockHistory
} = require('../models');
const path = require('path');
const fs = require('fs');
const {
    Op,
    fn, 
    col
} = require('sequelize');
const {
    recordStockHistory
} = require('../helpers/recordStockHistory');

// Halaman utama (table akan di-load via AJAX)
exports.index = (req, res) => {
    res.render('purchasing/index', {
        title: 'Purchasing',
        activePage: 'purchasing',
        purchasings: [],
        pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 1
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

exports.searchJSON = async (req, res) => {
    try {
        const supplierId = req.query.supplierId;
        const term = req.query.term?.trim() || '';

        if (!supplierId) return res.json({ products: [] });

        const where = {
            supplierId
        };

        if (term) {
            where.name = { [Op.like]: `%${term}%` };
        }

        const products = await Product.findAll({
            where,
            attributes: ['id', 'name', 'cost'] // cost digunakan sebagai harga default
        });

        res.json({ products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ products: [] });
    }
};

exports.listJSON = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search?.trim() || '';
        const supplier = req.query.supplier || '';
        const status = req.query.status || '';

        const where = {};
        if (search) where.id = {
            [Op.like]: `%${search}%`
        };
        if (supplier) where.supplierId = supplier;
        if (status) where.status = status;

        const {
            count,
            rows
        } = await Purchasing.findAndCountAll({
            where,
            include: [{
                    model: Supplier,
                    as: 'supplier',
                    attributes: ['name'],
                    required: false
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
            offset,
            distinct: true
        });

        const purchasingsWithReturn = await Promise.all(rows.map(async p => {
            // Hitung total returnQty (abs supaya selalu positif)
            const totalReturn = await StockHistory.sum('qty', {
                where: {
                    purchasingId: p.id,
                    type: 'return'
                }
            });
            return {
                ...p.toJSON(),
                returnQty: Math.abs(totalReturn || 0)
            };
        }));

        res.json({
            success: true,
            purchasings: purchasingsWithReturn,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            }
        });

    } catch (err) {
        console.error('Gagal load data purchasing:', err);
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

// Create purchasing (draft)
exports.create = async (req, res) => {
    try {
        const {
            supplierId,
            items,
            note
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
            notaFile: notaFilePath,
            note
        });

        const purchasingItems = itemsParsed.map(i => ({
            purchasingId: purchasing.id,
            productId: i.productId,
            qty: i.qty,
            price: i.price,
            updateCost: i.updateCost
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
                // Update stock
                product.stock = (product.stock || 0) + item.qty;

                // Update cost hanya jika flag updateCost = true
                if (item.updateCost) product.cost = item.price;

                await product.save();

                await recordStockHistory({
                    productId: product.id,
                    purchasingId: purchasing.id, // <-- tambahan
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
                    product.stock = (product.stock || 0) - item.qty;
                    await product.save();

                    await recordStockHistory({
                        productId: product.id,
                        purchasingId: purchasing.id, // <-- tambahan
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
            items,
            note
        } = req.body;
        const purchasing = await Purchasing.findByPk(req.params.id);
        if (!purchasing) return res.status(404).json({
            success: false,
            message: 'Purchasing tidak ditemukan'
        });

        for (const i of items) {
            const product = await Product.findByPk(i.productId);
            if (product) {
                product.stock = (product.stock || 0) - i.qty;
                await product.save();

                await recordStockHistory({
                    productId: product.id,
                    purchasingId: purchasing.id, // <-- tambahan
                    type: 'return',
                    qty: i.qty,
                    note: `Pengembalian Pembelian #${purchasing.id} | ${note || ''}`,
                    createdBy: req.user?.name || 'admin'
                });
            }
        }

        if (note) {
            purchasing.note = purchasing.note ? `${purchasing.note} | ${note}` : note;
            await purchasing.save();
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
