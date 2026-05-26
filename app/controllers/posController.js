// controllers/posController.js
const db = require('../models');
const { Product, Category, Customer, Sale, SaleItem, StockMovement, Promo } = db;
const { Op } = require('sequelize');

// Constanta untuk available product where clause
const availableProductWhere = {
    [Op.or]: [{
            type: 'fisik',
            stock: {
                [Op.gt]: 0
            }
        },
        {
            type: {
                [Op.in]: ['service', 'ppob']
            }
        }
    ]
};

// Reusable product attributes
const productAttributes = [
    'id',
    'name',
    'code',
    'barcode',
    'salePrice',
    'stock',
    'image',
    'unit',
    'categoryId',
    'type',
    'tax',
    'enableInputTax',
    'enableAltDesc',
    'priceChangeAllowed'
];

// Helper: Generate Invoice Number
function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
}

function normalizePromoCode(code) {
    return String(code || '').trim().toUpperCase();
}

function getPromoValidationError(promo, subtotal, now = new Date()) {
    if (!promo) return 'Kode promo tidak ditemukan';
    if (!promo.isActive) return 'Promo tidak aktif';
    if (promo.startDate && new Date(promo.startDate) > now) return 'Promo belum dimulai';
    if (promo.expiredAt && new Date(promo.expiredAt) < now) return 'Promo sudah berakhir';
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) return 'Limit penggunaan promo sudah habis';
    if (Number(promo.minTransaction || 0) > subtotal) {
        return `Minimal transaksi promo Rp ${Number(promo.minTransaction).toLocaleString('id-ID')}`;
    }
    return null;
}

async function calculatePromoDiscount({ code, items, subtotal, transaction = null }) {
    const promoCode = normalizePromoCode(code);
    if (!promoCode) {
        return { promo: null, discount: 0, eligibleSubtotal: 0 };
    }

    const promo = await Promo.findOne({
        where: { code: promoCode },
        transaction
    });

    const validationError = getPromoValidationError(promo, Number(subtotal) || 0);
    if (validationError) {
        throw new Error(validationError);
    }

    const productIds = (items || [])
        .map(item => parseInt(item.productId, 10))
        .filter(Boolean);

    const products = await Product.findAll({
        where: { id: productIds },
        attributes: ['id', 'categoryId'],
        transaction
    });

    const productMap = new Map(products.map(product => [product.id, product]));
    let eligibleSubtotal = 0;

    for (const item of items || []) {
        const productId = parseInt(item.productId, 10);
        const product = productMap.get(productId);
        if (!product) continue;

        let eligible = promo.applyType === 'all';
        if (promo.applyType === 'category') {
            eligible = Number(product.categoryId) === Number(promo.categoryId);
        } else if (promo.applyType === 'product') {
            eligible = productId === Number(promo.productId);
        }

        if (eligible) {
            const itemSubtotal = Math.max(0, Number(item.subtotal) || ((Number(item.price) || 0) * (Number(item.quantity) || 0)));
            eligibleSubtotal += itemSubtotal;
        }
    }

    if (eligibleSubtotal <= 0) {
        throw new Error('Promo tidak berlaku untuk produk di keranjang');
    }

    let discount = promo.type === 'percent'
        ? eligibleSubtotal * (Number(promo.value) / 100)
        : Number(promo.value);

    if (promo.maxDiscount && promo.type === 'percent') {
        discount = Math.min(discount, Number(promo.maxDiscount));
    }

    discount = Math.min(Math.round(discount), eligibleSubtotal);

    return { promo, discount, eligibleSubtotal };
}

// GET POS page
exports.index = async (req, res) => {
    try {
        const whereClause = { ...availableProductWhere };

        const favoriteProducts = await Product.findAll({
            where: whereClause,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }],
            order: [
                ['stock', 'DESC'],
                ['name', 'ASC']
            ],
            limit: 8
        });

        const categories = await Category.findAll({
            order: [['name', 'ASC']],
            attributes: ['id', 'name']
        });

        let customers = [];
        try {
            if (Customer) {
                let defaultCustomer = await Customer.findOne({
                    where: { name: 'Walk-in Customer' }
                });

                if (!defaultCustomer) {
                    defaultCustomer = await Customer.create({
                        name: 'Walk-in Customer',
                        type: 'umum',
                        status: 'active',
                        phone: '-',
                        memberDiscount: 0,
                        point: 0
                    });
                }

                customers = await Customer.findAll({
                    where: { status: 'active' },
                    order: [['name', 'ASC']],
                    attributes: ['id', 'name', 'phone', 'email', 'type', 'memberDiscount']
                });
            }
        } catch (err) {
            console.error('Error fetching customers:', err.message);
            customers = [];
        }

        res.render('pos/pos', {
            title: 'Point of Sale',
            layout: false,
            activePage: 'pos',
            products: favoriteProducts,
            categories,
            customers,
            taxRate: 11,
            date: new Date().toISOString(),
            invoiceNumber: generateInvoiceNumber()
        });

    } catch (err) {
        console.error('Error loading POS:', err);
        res.status(500).send(`
            <h1>Error Loading POS</h1>
            <p>${err.message}</p>
            <pre>${err.stack}</pre>
        `);
    }
};

// API: Search products
exports.searchProducts = async (req, res) => {
    try {
        const { q, categoryId } = req.query;
        const whereClause = {};

        if (q && q.trim()) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${q}%` } },
                { code: { [Op.like]: `%${q}%` } },
                { barcode: { [Op.like]: `%${q}%` } }
            ];
        }

        if (categoryId && categoryId !== 'all') {
            whereClause.categoryId = parseInt(categoryId);
        }

        const products = await Product.findAll({
            where: whereClause,
            attributes: productAttributes,
            limit: 50,
            order: [['name', 'ASC']]
        });

        res.json({ success: true, products });
    } catch (err) {
        console.error('Error searching products:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: Get favorite products
exports.getFavoriteProducts = async (req, res) => {
    try {
        const { categoryId, limit = 8 } = req.query;
        const whereClause = { ...availableProductWhere };

        if (categoryId && categoryId !== 'all') {
            whereClause.categoryId = parseInt(categoryId);
        }

        const products = await Product.findAll({
            where: whereClause,
            attributes: productAttributes,
            order: [
                ['stock', 'DESC'],
                ['name', 'ASC']
            ],
            limit: parseInt(limit)
        });

        res.json({ success: true, products });
    } catch (err) {
        console.error('Error fetching favorite products:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: Get product by barcode or code
exports.getProductByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;

        if (!barcode) {
            return res.status(400).json({
                success: false,
                message: 'Barcode tidak boleh kosong'
            });
        }

        const product = await Product.findOne({
            where: {
                [Op.and]: [
                    {
                        [Op.or]: [
                            { barcode: barcode },
                            { code: barcode }
                        ]
                    },
                    { ...availableProductWhere }
                ]
            },
            attributes: productAttributes
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }

        if (product.type === 'fisik' && product.stock <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Stok produk habis'
            });
        }

        res.json({ success: true, product });
    } catch (err) {
        console.error('Error finding product by barcode:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// API: Get customer by phone/email/name
exports.searchCustomers = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ customers: [] });
        }

        if (!Customer) {
            return res.json({ customers: [] });
        }

        const customers = await Customer.findAll({
            where: {
                status: 'active',
                [Op.or]: [
                    { name: { [Op.like]: `%${q}%` } },
                    { phone: { [Op.like]: `%${q}%` } },
                    { email: { [Op.like]: `%${q}%` } }
                ]
            },
            attributes: ['id', 'name', 'phone', 'email', 'type', 'memberDiscount'],
            limit: 10
        });

        res.json({ customers });
    } catch (err) {
        console.error('Error searching customers:', err);
        res.status(500).json({ customers: [] });
    }
};

// API: Get all customers
exports.getCustomers = async (req, res) => {
    try {
        if (!Customer) {
            return res.json({ customers: [] });
        }

        const customers = await Customer.findAll({
            where: { status: 'active' },
            order: [['name', 'ASC']],
            attributes: ['id', 'name', 'phone', 'email', 'type', 'memberDiscount'],
            limit: 100
        });

        res.json({ customers });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ customers: [] });
    }
};

// API: Get next invoice number
exports.getNextInvoiceNumber = (req, res) => {
    res.json({ success: true, invoiceNumber: generateInvoiceNumber() });
};

exports.applyPromo = async (req, res) => {
    try {
        const { code, items = [], subtotal = 0 } = req.body;

        if (!items.length) {
            return res.status(400).json({
                success: false,
                message: 'Keranjang belanja kosong'
            });
        }

        const { promo, discount, eligibleSubtotal } = await calculatePromoDiscount({
            code,
            items,
            subtotal
        });

        res.json({
            success: true,
            message: 'Promo berhasil diterapkan',
            promo: {
                id: promo.id,
                code: promo.code,
                name: promo.name,
                type: promo.type,
                value: promo.value,
                applyType: promo.applyType,
                categoryId: promo.categoryId,
                productId: promo.productId
            },
            discount,
            eligibleSubtotal
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// POST: Save transaction (FULL VERSION)
exports.saveTransaction = async (req, res) => {
    const t = await db.sequelize.transaction();
    
    try {
        const {
            customerId,
            items,
            subtotal,
            tax,
            discount,
            total,
            paymentMethod,
            amountReceived,
            change,
            notes,
            promoCode,
            invoiceNumber: requestedInvoiceNumber
        } = req.body;

        if (!items || items.length === 0) {
            throw new Error('Keranjang belanja kosong');
        }

        if (!paymentMethod) {
            throw new Error('Metode pembayaran harus dipilih');
        }

        let promo = null;
        let promoDiscount = 0;
        let finalDiscount = parseFloat(discount) || 0;
        let finalTotal = parseFloat(total);

        if (promoCode) {
            const promoResult = await calculatePromoDiscount({
                code: promoCode,
                items,
                subtotal,
                transaction: t
            });
            promo = promoResult.promo;
            promoDiscount = promoResult.discount;
            finalDiscount = promoDiscount;
            finalTotal = Math.max(0, (parseFloat(subtotal) || 0) + (parseFloat(tax) || 0) - promoDiscount);
        }

        // VALIDASI PEMBAYARAN
        if (paymentMethod === 'cash') {
            const received = parseFloat(amountReceived) || 0;
            const totalAmount = finalTotal;
            
            if (received < totalAmount) {
                throw new Error(`Uang pembayaran kurang: Rp ${totalAmount - received} yang harus dibayar`);
            }
        }

        const invoiceNumber = String(requestedInvoiceNumber || '').trim() || generateInvoiceNumber();
        const existingSale = await Sale.findOne({
            where: { invoiceNumber },
            transaction: t
        });

        if (existingSale) {
            throw new Error(`Nomor invoice ${invoiceNumber} sudah pernah digunakan`);
        }

        // Create sale
        const sale = await Sale.create({
            invoiceNumber,
            customerId: customerId || null,
            subtotal: parseFloat(subtotal),
            tax: parseFloat(tax),
            discount: finalDiscount,
            total: finalTotal,
            paymentMethod,
            amountReceived: parseFloat(amountReceived) || 0,
            change: parseFloat(change) || 0,
            notes: notes || null,
            cashierId: req.user?.id || null,
            status: 'paid',
            promoId: promo ? promo.id : null,
            promoCode: promo ? promo.code : null,
            promoDiscount
        }, { transaction: t });

        if (promo) {
            await promo.increment('usedCount', { by: 1, transaction: t });
        }

        // Process items
        for (const item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t });
            
            if (!product) {
                throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
            }

            if (product.type === 'fisik' && product.stock < item.quantity) {
                throw new Error(`Stok ${product.name} tidak mencukupi (tersedia: ${product.stock})`);
            }

            await SaleItem.create({
                saleId: sale.id,
                productId: product.id,
                qty: item.quantity,
                price: parseFloat(item.price),
                subtotal: parseFloat(item.subtotal),
                tax: parseFloat(item.tax) || 0,
                discount: parseFloat(item.discount) || 0,
                notes: item.notes || null
            }, { transaction: t });

            // Update stock using decrement (atomic)
            if (product.type === 'fisik') {
                const beforeStock = product.stock;
                await product.decrement('stock', {
                    by: item.quantity,
                    transaction: t
                });
                
                // Reload to get after stock
                await product.reload({ transaction: t });
                
                // Create stock movement record
                await StockMovement.create({
                    productId: product.id,
                    qty: -item.quantity,
                    type: 'sale',
                    referenceId: sale.id,
                    referenceType: 'Sale',
                    beforeStock: beforeStock,
                    afterStock: product.stock,
                    notes: `Penjualan invoice ${invoiceNumber}`,
                    createdBy: req.user?.id || null
                }, { transaction: t });
            }
        }

        await t.commit();

        res.json({
            success: true,
            message: 'Transaksi berhasil disimpan',
            invoiceNumber: sale.invoiceNumber,
            saleId: sale.id
        });

    } catch (err) {
        await t.rollback();
        console.error('Error saving transaction:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// VOID Transaction (NEW)
exports.voidTransaction = async (req, res) => {
    const t = await db.sequelize.transaction();
    
    try {
        const { saleId, reason } = req.body;
        
        if (!saleId) {
            throw new Error('ID transaksi diperlukan');
        }
        
        if (!reason) {
            throw new Error('Alasan pembatalan harus diisi');
        }
        
        // Find sale
        const sale = await Sale.findByPk(saleId, {
            include: [{
                model: SaleItem,
                as: 'items'
            }],
            transaction: t
        });
        
        if (!sale) {
            throw new Error('Transaksi tidak ditemukan');
        }
        
        if (sale.status !== 'paid') {
            throw new Error(`Transaksi dengan status ${sale.status} tidak dapat dibatalkan`);
        }
        
        // Update sale status
        await sale.update({
            status: 'void',
            voidReason: reason,
            voidedBy: req.user?.id || null,
            voidedAt: new Date()
        }, { transaction: t });
        
        // Return stock for physical products
        for (const item of sale.items) {
            const product = await Product.findByPk(item.productId, { transaction: t });
            
            if (product && product.type === 'fisik') {
                const beforeStock = product.stock;
                await product.increment('stock', {
                    by: item.qty,
                    transaction: t
                });
                
                await product.reload({ transaction: t });
                
                // Create stock movement record
                await StockMovement.create({
                    productId: product.id,
                    qty: item.qty,
                    type: 'void_return',
                    referenceId: sale.id,
                    referenceType: 'Sale',
                    beforeStock: beforeStock,
                    afterStock: product.stock,
                    notes: `Pembatalan transaksi ${sale.invoiceNumber}. Alasan: ${reason}`,
                    createdBy: req.user?.id || null
                }, { transaction: t });
            }
        }
        
        await t.commit();
        
        res.json({
            success: true,
            message: 'Transaksi berhasil dibatalkan',
            saleId: sale.id,
            invoiceNumber: sale.invoiceNumber
        });
        
    } catch (err) {
        await t.rollback();
        console.error('Error voiding transaction:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Get Transaction History with Pagination (UPDATED)
exports.getTransactionHistory = async (req, res) => {
    try {
        const { limit = 50, offset = 0, status } = req.query;
        
        const whereClause = {};
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        
        const { count, rows: sales } = await Sale.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: SaleItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'name', 'code', 'type']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json({
            success: true,
            sales,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Get Daily Sales Report (NEW)
exports.getDailySalesReport = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const sales = await Sale.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startOfDay, endOfDay]
                },
                status: 'paid'
            },
            include: [{
                model: SaleItem,
                as: 'items'
            }]
        });
        
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
        const totalTax = sales.reduce((sum, sale) => sum + parseFloat(sale.tax), 0);
        const totalDiscount = sales.reduce((sum, sale) => sum + parseFloat(sale.discount), 0);
        
        // Top products
        const productSales = {};
        for (const sale of sales) {
            for (const item of sale.items) {
                const product = await Product.findByPk(item.productId);
                if (product) {
                    if (!productSales[product.id]) {
                        productSales[product.id] = {
                            name: product.name,
                            qty: 0,
                            revenue: 0
                        };
                    }
                    productSales[product.id].qty += item.qty;
                    productSales[product.id].revenue += parseFloat(item.subtotal);
                }
            }
        }
        
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        res.json({
            success: true,
            date: startOfDay,
            summary: {
                totalSales,
                totalRevenue,
                totalTax,
                totalDiscount,
                averageTransactionValue: totalSales > 0 ? totalRevenue / totalSales : 0
            },
            topProducts
        });
        
    } catch (err) {
        console.error('Error generating daily report:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Debug endpoint
exports.debug = async (req, res) => {
    try {
        const allProducts = await Product.findAll({
            attributes: ['id', 'name', 'type', 'stock', 'salePrice']
        });

        const fisikProducts = await Product.findAll({
            where: {
                type: 'fisik',
                stock: { [Op.gt]: 0 }
            },
            attributes: ['id', 'name', 'type', 'stock', 'salePrice']
        });

        const serviceProducts = await Product.findAll({
            where: { type: 'service' },
            attributes: ['id', 'name', 'type', 'stock', 'salePrice']
        });

        const ppobProducts = await Product.findAll({
            where: { type: 'ppob' },
            attributes: ['id', 'name', 'type', 'stock', 'salePrice']
        });

        const customers = await Customer.findAll({
            where: { status: 'active' },
            attributes: ['id', 'name', 'type', 'phone']
        });

        res.json({
            summary: {
                totalProducts: allProducts.length,
                fisikWithStock: fisikProducts.length,
                serviceProducts: serviceProducts.length,
                ppobProducts: ppobProducts.length
            },
            products: {
                fisik: fisikProducts,
                service: serviceProducts,
                ppob: ppobProducts,
                all: allProducts
            },
            customers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
