// controllers/posController.js
const db = require('../models');
const {
    Product,
    Category,
    Customer,
    Sale,
    SaleItem,
    StockMovement,
    SalePayment,
    Promo
} = db;
const { Op } = require('sequelize');
const { recordAudit } = require('../helpers/audit');
const transactionService = require('../services/transactionService');

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

function uniqueNumericIds(values) {
    return [...new Set((values || [])
        .map(value => parseInt(value, 10))
        .filter(Number.isFinite))];
}

function isWalkInCustomer(customer) {
    const name = String(customer?.name || '').trim().toLowerCase();
    return name === 'walk-in customer' || name === 'umum';
}

async function bulkDecrementProductStock(stockDeltas, transaction) {
    const entries = [...stockDeltas.entries()]
        .map(([productId, qty]) => [parseInt(productId, 10), Number(qty)])
        .filter(([productId, qty]) => Number.isFinite(productId) && Number.isFinite(qty) && qty > 0);

    if (entries.length === 0) return;

    const queryInterface = db.sequelize.getQueryInterface();
    // Support for different Sequelize versions
    const quoteTable = (table) => (queryInterface.queryGenerator.quoteTable ? queryInterface.queryGenerator.quoteTable(table) : queryInterface.quoteTable(table));
    const quoteIdentifier = (id) => (queryInterface.queryGenerator.quoteIdentifier ? queryInterface.queryGenerator.quoteIdentifier(id) : queryInterface.quoteIdentifier(id));

    const table = quoteTable(Product.getTableName());
    const idColumn = quoteIdentifier('id');
    const stockColumn = quoteIdentifier('stock');
    
    const caseSql = entries
        .map(([productId, qty]) => `WHEN ${productId} THEN ${qty}`)
        .join(' ');
    const idsSql = entries.map(([productId]) => productId).join(', ');

    await db.sequelize.query(
        `UPDATE ${table} SET ${stockColumn} = ${stockColumn} - CASE ${idColumn} ${caseSql} ELSE 0 END WHERE ${idColumn} IN (${idsSql})`,
        { transaction }
    );
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

async function calculatePromoDiscount({ code, items, subtotal, transaction = null, productMap = null }) {
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

    if (!productMap) {
        const productIds = uniqueNumericIds((items || []).map(item => item.productId));
        const products = await Product.findAll({
            where: { id: productIds },
            attributes: ['id', 'categoryId'],
            transaction
        });

        productMap = new Map(products.map(product => [product.id, product]));
    }
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

// POST: Save transaction (OPTIMIZED & ROBUST VERSION)
exports.saveTransaction = async (req, res) => {
    // 1. Pre-validation (Defensive Code)
    const {
        customerId,
        items,
        subtotal,
        tax,
        discount,
        total,
        grandTotal, // alternative field name
        paymentMethod,
        amountReceived,
        change,
        notes,
        promoCode,
        isDebtMode,
        paidAmount,
        dueDate,
        invoiceNumber: requestedInvoiceNumber
    } = req.body || {};

    let inputTotal, inputSubtotal, inputTax, inputDiscount, inputPaidAmount;

    try {
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Keranjang belanja kosong" });
        }

        inputTotal = parseFloat(total ?? grandTotal);
        if (isNaN(inputTotal) || inputTotal < 0) {
            return res.status(400).json({ success: false, message: "Total transaksi tidak valid" });
        }

        inputSubtotal = parseFloat(subtotal) || 0;
        inputTax = parseFloat(tax) || 0;
        inputDiscount = parseFloat(discount) || 0;
        inputPaidAmount = parseFloat(paidAmount) || 0;

        if (isDebtMode && !customerId) {
            return res.status(400).json({ success: false, message: "Customer wajib dipilih untuk transaksi hutang/DP" });
        }

        if (isDebtMode && inputPaidAmount > inputTotal + 1) { // small epsilon for float rounding
            return res.status(400).json({ success: false, message: "Jumlah pembayaran tidak boleh melebihi total transaksi" });
        }

        const allowedPaymentMethods = new Set(["cash", "card", "qris", "transfer"]);
        if (inputPaidAmount > 0 && !allowedPaymentMethods.has(paymentMethod || "cash")) {
            return res.status(400).json({ success: false, message: "Metode pembayaran tidak valid" });
        }
    } catch (validationErr) {
        console.error("Pre-validation error:", validationErr);
        return res.status(400).json({ success: false, message: "Format data tidak valid" });
    }

    const t = await db.sequelize.transaction();
    
    try {
        const productIds = uniqueNumericIds(items.map(i => i.productId));
        
        // Use queryGenerator for compatibility if needed, though findAll usually handles it
        const findOptions = {
            where: { id: productIds },
            transaction: t
        };
        
        // LOCK.UPDATE is not supported in SQLite, so we skip it to prevent errors
        if (db.sequelize.getDialect() !== 'sqlite') {
            findOptions.lock = t.LOCK.UPDATE;
        }

        const products = await Product.findAll(findOptions);
        const productMap = new Map(products.map(p => [p.id, p]));
        const stockDeltas = new Map();

        let promo = null;
        let promoDiscount = 0;
        let finalDiscount = inputDiscount;
        let finalTotal = inputTotal;

        if (promoCode) {
            const promoResult = await calculatePromoDiscount({
                code: promoCode,
                items,
                subtotal: inputSubtotal,
                transaction: t,
                productMap
            });
            promo = promoResult.promo;
            promoDiscount = promoResult.discount;
            finalDiscount = promoDiscount;
            finalTotal = Math.max(0, inputSubtotal + inputTax - promoDiscount);
        }

        // Final rounding to 2 decimal places
        finalTotal = Math.round(finalTotal * 100) / 100;

        const recordedPaidAmount = isDebtMode
            ? Math.max(0, inputPaidAmount)
            : finalTotal;
        
        const debtRemainingAmount = Math.max(0, Math.round((finalTotal - recordedPaidAmount) * 100) / 100);
        
        const finalPaymentStatus = debtRemainingAmount <= 0
            ? "paid"
            : (recordedPaidAmount > 0 ? "partial" : "unpaid");

        let customer = null;
        if (debtRemainingAmount > 0) {
            const customerFindOptions = { transaction: t };
            if (db.sequelize.getDialect() !== 'sqlite') {
                customerFindOptions.lock = t.LOCK.UPDATE;
            }
            customer = await Customer.findByPk(customerId, customerFindOptions);
            
            if (!customer || isWalkInCustomer(customer)) {
                throw new Error("Transaksi hutang/DP tidak boleh menggunakan customer umum/Walk-in Customer");
            }

            const currentDebt = Number(customer.total_debt || 0);
            const newTotalDebt = Math.round((currentDebt + debtRemainingAmount) * 100) / 100;
            
            if (newTotalDebt > Number(customer.debt_limit || 0)) {
                throw new Error(`Melebihi limit hutang customer. Limit: Rp ${Number(customer.debt_limit || 0).toLocaleString("id-ID")}`);
            }

            await customer.update({ total_debt: newTotalDebt }, { transaction: t });
        }

        if (!isDebtMode && (paymentMethod === "cash" || !paymentMethod)) {
            const received = parseFloat(amountReceived) || 0;
            if (received < finalTotal - 1) { // epsilon
                throw new Error(`Uang pembayaran kurang: Rp ${Math.round(finalTotal - received)} yang harus dibayar`);
            }
        }

        const invoiceNumber = String(requestedInvoiceNumber || "").trim() || generateInvoiceNumber();
        const existingSale = await Sale.findOne({
            where: { invoiceNumber },
            transaction: t
        });
        if (existingSale) {
            throw new Error(`Nomor invoice ${invoiceNumber} sudah pernah digunakan`);
        }

        const sale = await Sale.create({
            invoiceNumber,
            customerId: customerId || null,
            subtotal: inputSubtotal,
            tax: inputTax,
            discount: finalDiscount,
            total: finalTotal,
            paymentMethod: recordedPaidAmount > 0 ? (paymentMethod || "cash") : null,
            amountReceived: parseFloat(amountReceived) || 0,
            change: parseFloat(change) || 0,
            notes: notes || null,
            cashierId: req.user?.id || null,
            status: "completed",
            promoId: promo ? promo.id : null,
            promoCode: promo ? promo.code : null,
            promoDiscount,
            paymentStatus: finalPaymentStatus,
            paidAmount: recordedPaidAmount,
            remainingAmount: debtRemainingAmount,
            dueDate: (finalPaymentStatus === "paid" || !isDebtMode) ? null : (dueDate || null)
        }, { transaction: t });

        const saleItemsData = [];
        const stockMovementsData = [];
        
        for (const item of items) {
            const productId = parseInt(item.productId, 10);
            if (isNaN(productId)) continue;

            const quantity = Number(item.quantity) || 0;
            const product = productMap.get(productId);
            if (!product) {
                throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
            }

            if (quantity <= 0) {
                throw new Error(`Jumlah produk ${product.name} tidak valid`);
            }

            const previousRequestedQty = stockDeltas.get(productId) || 0;
            const currentRequestedQty = previousRequestedQty + quantity;
            if (product.type === "fisik" && Number(product.stock) < currentRequestedQty) {
                throw new Error(`Stok ${product.name} tidak mencukupi (tersedia: ${product.stock})`);
            }

            const itemPrice = parseFloat(item.price) || 0;
            const itemSubtotal = parseFloat(item.subtotal) || (itemPrice * quantity);

            saleItemsData.push({
                saleId: sale.id,
                productId: product.id,
                qty: quantity,
                price: itemPrice,
                subtotal: itemSubtotal,
                tax: parseFloat(item.tax) || 0,
                discount: parseFloat(item.discount) || 0,
                notes: item.notes || item.altDesc || null
            });

            if (product.type === "fisik") {
                const beforeStock = Number(product.stock) - previousRequestedQty;
                const afterStock = Number(product.stock) - currentRequestedQty;
                stockDeltas.set(productId, currentRequestedQty);
                
                stockMovementsData.push({
                    productId: product.id,
                    qty: -quantity,
                    type: "sale",
                    referenceId: sale.id,
                    referenceType: "Sale",
                    beforeStock: beforeStock,
                    afterStock: afterStock,
                    notes: `Penjualan invoice ${invoiceNumber}`,
                    createdBy: req.user?.id || null
                });
            }
        }

        await bulkDecrementProductStock(stockDeltas, t);
        await SaleItem.bulkCreate(saleItemsData, { transaction: t });
        if (stockMovementsData.length > 0) {
            await StockMovement.bulkCreate(stockMovementsData, { transaction: t });
        }

        if (recordedPaidAmount > 0) {
            await SalePayment.create({
                saleId: sale.id,
                amount: recordedPaidAmount,
                paymentMethod: paymentMethod || "cash",
                note: finalPaymentStatus === "paid" 
                    ? `Pembayaran invoice ${invoiceNumber}` 
                    : `Pembayaran awal / DP invoice ${invoiceNumber}`,
                paidAt: new Date(),
                createdBy: req.user?.id || null
            }, { transaction: t });
        }

        if (promo) {
            await promo.increment("usedCount", { by: 1, transaction: t });
        }

        await recordAudit(req, {
            action: "create_sale",
            entity: "Sale",
            entityId: sale.id,
            newValue: { invoiceNumber, total: finalTotal, paymentStatus: finalPaymentStatus },
            transaction: t
        });

        await t.commit();

        return res.json({
            success: true,
            message: "Transaksi berhasil disimpan",
            invoiceNumber: sale.invoiceNumber,
            saleId: sale.id
        });

    } catch (err) {
        console.error("FATAL ERROR IN saveTransaction:");
        console.error(err);
        if (err.stack) console.error(err.stack);

        try {
            if (t) await t.rollback();
        } catch (rollbackErr) {
            console.error("CRITICAL: Transaction rollback failed!");
            console.error(rollbackErr);
        }
        
        const isClientError = err.name === 'SequelizeValidationError' || 
                             err.name === 'SequelizeUniqueConstraintError' ||
                             !err.stack.includes('node_modules');

        return res.status(isClientError ? 400 : 500).json({
            success: false,
            message: err.message,
            debug: process.env.NODE_ENV === 'development' ? {
                name: err.name,
                stack: err.stack,
                errors: err.errors ? err.errors.map(e => e.message) : undefined
            } : undefined
        });
    }
};

// Checkout dengan support hutang/DP
async function checkoutWithDebt(req, res) {
    req.body = {
        ...req.body,
        total: req.body.total ?? req.body.grandTotal,
        isDebtMode: true
    };

    return exports.saveTransaction(req, res);
}

// Pelunasan hutang
async function settleDebt(req, res) {
    const transaction = await db.sequelize.transaction();
    
    try {
        const result = await transactionService.settleDebt({
            ...req.body,
            userId: req.user?.id || null,
            transaction,
            req
        });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Pembayaran berhasil dicatat',
            data: {
                saleId: result.sale.id,
                invoiceNumber: result.sale.invoiceNumber,
                paidAmount: result.paidAmount,
                remainingAmount: result.remainingAmount,
                paymentStatus: result.paymentStatus
            }
        });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Settle debt error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
}

// Get outstanding debts (piutang)
async function getOutstandingDebts(req, res) {
    try {
        const { customerId, limit = 20, offset = 0 } = req.query;
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
        
        let whereCondition = {
            remainingAmount: { [Op.gt]: 0 },
            status: 'completed',
            paymentStatus: { [Op.in]: ['unpaid', 'partial'] }
        };
        
        if (customerId) {
            whereCondition.customerId = customerId;
        }

        const totalItems = await Sale.count({ where: whereCondition });
        
        const sales = await Sale.findAll({
            where: whereCondition,
            include: [
                {
                    model: Customer,
                    as: 'customer',
                    attributes: ['id', 'name', 'phone', 'debt_limit']
                }
            ],
            order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
            limit: parsedLimit,
            offset: parsedOffset
        });
        
        const today = new Date();
        const categorizedSales = sales.map(sale => {
            const createdAt = new Date(sale.createdAt);
            const diffTime = Math.abs(today - createdAt);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let agingCategory = '0-30 hari';
            if (diffDays > 90) agingCategory = '> 90 hari';
            else if (diffDays > 60) agingCategory = '61-90 hari';
            else if (diffDays > 30) agingCategory = '31-60 hari';

            return {
                ...sale.toJSON(),
                agingDays: diffDays,
                agingCategory
            };
        });

        res.json({
            success: true,
            data: categorizedSales,
            pagination: {
                limit: parsedLimit,
                offset: parsedOffset,
                totalItems
            },
            summary: {
                pageOutstanding: categorizedSales.reduce((sum, sale) => sum + Number(sale.remainingAmount || 0), 0)
            }
        });
        
    } catch (error) {
        console.error('Get outstanding debts error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.voidTransaction = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const { saleId, reason } = req.body;
        const result = await transactionService.voidTransaction({
            saleId,
            reason,
            userId: req.user?.id || null,
            transaction: t,
            req
        });

        await t.commit();

        res.json({
            success: true,
            message: 'Transaksi berhasil dibatalkan',
            saleId: result.sale.id,
            invoiceNumber: result.sale.invoiceNumber,
            restoredStockMovements: result.stockMovements.length
        });
    } catch (err) {
        await t.rollback();
        console.error('Error voiding transaction:', err);
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

exports.getTransactionHistory = async (req, res) => {
    try {
        const { limit = 50, offset = 0, status } = req.query;
        const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
        const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
        const where = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        const { count, rows: sales } = await Sale.findAndCountAll({
            where,
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
            limit: parsedLimit,
            offset: parsedOffset,
            distinct: true
        });

        res.json({
            success: true,
            sales,
            total: count,
            limit: parsedLimit,
            offset: parsedOffset
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
                status: 'completed'
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
        const reportProductIds = uniqueNumericIds(
            sales.flatMap(sale => sale.items.map(item => item.productId))
        );
        const reportProducts = reportProductIds.length > 0
            ? await Product.findAll({
                where: { id: reportProductIds },
                attributes: ['id', 'name']
            })
            : [];
        const reportProductMap = new Map(reportProducts.map(product => [product.id, product]));
        const productSales = {};

        for (const sale of sales) {
            for (const item of sale.items) {
                const product = reportProductMap.get(item.productId);
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

exports.checkoutWithDebt = checkoutWithDebt;
exports.settleDebt = settleDebt;
exports.getOutstandingDebts = getOutstandingDebts;
exports.generateInvoiceNumber = generateInvoiceNumber;
