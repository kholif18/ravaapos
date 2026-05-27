const db = require('../models');
const { Sale, SaleItem, SalePayment, Customer, Product, StockMovement } = db;
const { recordAudit } = require('../helpers/audit');

const PAYMENT_METHODS = new Set(['cash', 'card', 'qris', 'transfer']);

function toMoney(value) {
    return Number((Number(value || 0)).toFixed(2));
}

function assertValidPaymentMethod(paymentMethod) {
    if (!PAYMENT_METHODS.has(paymentMethod)) {
        throw new Error('Metode pembayaran tidak valid');
    }
}

async function syncCustomerDebt(customerId, deltaAmount, transaction) {
    if (!customerId || !deltaAmount) return null;

    const customer = await Customer.findByPk(customerId, {
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!customer) return null;

    const nextDebt = Math.max(0, toMoney(customer.total_debt) + toMoney(deltaAmount));
    await customer.update({ total_debt: nextDebt }, { transaction });

    return customer;
}

async function bulkIncrementProductStock(stockDeltas, transaction) {
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
    
    const caseSql = entries.map(([productId, qty]) => `WHEN ${productId} THEN ${qty}`).join(' ');
    const idsSql = entries.map(([productId]) => productId).join(', ');

    await db.sequelize.query(
        `UPDATE ${table} SET ${stockColumn} = ${stockColumn} + CASE ${idColumn} ${caseSql} ELSE 0 END WHERE ${idColumn} IN (${idsSql})`,
        { transaction }
    );
}

async function restoreSaleStock({ sale, transaction, userId, reason }) {
    const items = sale.items || [];
    const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))];

    if (productIds.length === 0) return [];

    const products = await Product.findAll({
        where: { id: productIds },
        transaction,
        lock: transaction.LOCK.UPDATE
    });
    const productMap = new Map(products.map(product => [product.id, product]));
    const stockDeltas = new Map();
    const movements = [];

    // Build per-item stock history while aggregating one stock update per product.
    for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || product.type !== 'fisik') continue;

        const qty = Number(item.qty || 0);
        const previousReturnedQty = stockDeltas.get(product.id) || 0;
        const beforeStock = Number(product.stock || 0) + previousReturnedQty;
        const afterStock = beforeStock + qty;

        stockDeltas.set(product.id, previousReturnedQty + qty);
        movements.push({
            productId: product.id,
            qty,
            type: 'void_sale',
            referenceId: sale.id,
            referenceType: 'Sale',
            beforeStock,
            afterStock,
            notes: `Void penjualan ${sale.invoiceNumber}. Alasan: ${reason}`,
            createdBy: userId || null
        });
    }

    await bulkIncrementProductStock(stockDeltas, transaction);

    if (movements.length > 0) {
        await StockMovement.bulkCreate(movements, { transaction });
    }

    return movements;
}

async function settleDebt({ saleId, amount, paymentMethod, note, paidAt, userId, transaction, req }) {
    const paymentAmount = toMoney(amount);
    assertValidPaymentMethod(paymentMethod);

    if (!saleId || paymentAmount <= 0) {
        throw new Error('Data pembayaran tidak valid');
    }

    const sale = await Sale.findByPk(saleId, {
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!sale) throw new Error('Transaksi tidak ditemukan');
    if (sale.status !== 'completed') throw new Error('Transaksi void/cancelled tidak bisa dibayar');
    if (sale.paymentStatus === 'cancelled') throw new Error('Transaksi cancelled tidak bisa dibayar');
    if (sale.paymentStatus === 'paid') throw new Error('Transaksi sudah lunas');

    const remaining = toMoney(sale.remainingAmount);
    if (remaining <= 0) throw new Error('Transaksi tidak memiliki sisa hutang');
    if (paymentAmount > remaining) throw new Error('Jumlah pembayaran melebihi sisa hutang');

    const payment = await SalePayment.create({
        saleId: sale.id,
        amount: paymentAmount,
        paymentMethod,
        note: note || `Pelunasan hutang invoice ${sale.invoiceNumber}`,
        paidAt: paidAt || new Date(),
        createdBy: userId || null
    }, { transaction });

    const newPaidAmount = toMoney(sale.paidAmount) + paymentAmount;
    const newRemainingAmount = toMoney(remaining - paymentAmount);
    const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'partial';

    await sale.update({
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
    }, { transaction });

    await syncCustomerDebt(sale.customerId, -paymentAmount, transaction);

    if (req) {
        await recordAudit(req, {
            action: 'settle_debt',
            entity: 'SalePayment',
            entityId: payment.id,
            newValue: {
                saleId: sale.id,
                invoiceNumber: sale.invoiceNumber,
                amount: paymentAmount,
                paymentMethod,
                paymentStatus: newPaymentStatus
            },
            transaction
        });
    }

    return { sale, payment, paidAmount: newPaidAmount, remainingAmount: newRemainingAmount, paymentStatus: newPaymentStatus };
}

async function voidTransaction({ saleId, reason, userId, transaction, req }) {
    if (!saleId) throw new Error('ID transaksi diperlukan');
    if (!reason) throw new Error('Alasan pembatalan harus diisi');

    const sale = await Sale.findByPk(saleId, {
        include: [{ model: SaleItem, as: 'items' }],
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!sale) throw new Error('Transaksi tidak ditemukan');
    if (sale.status === 'void') throw new Error('Transaksi sudah void');
    if (sale.status === 'cancelled') throw new Error('Transaksi sudah cancelled');
    if (sale.status !== 'completed') throw new Error(`Transaksi dengan status ${sale.status} tidak dapat dibatalkan`);

    const previousRemainingAmount = toMoney(sale.remainingAmount);
    const previousPaymentStatus = sale.paymentStatus;
    const stockMovements = await restoreSaleStock({ sale, transaction, userId, reason });

    if (previousRemainingAmount > 0) {
        await syncCustomerDebt(sale.customerId, -previousRemainingAmount, transaction);
    }

    await sale.update({
        status: 'void',
        paymentStatus: 'cancelled',
        remainingAmount: 0,
        voidReason: reason,
        voidedBy: userId || null,
        voidedAt: new Date()
    }, { transaction });

    if (req) {
        await recordAudit(req, {
            action: 'void_transaction',
            entity: 'Sale',
            entityId: sale.id,
            oldValue: {
                status: 'completed',
                paymentStatus: previousPaymentStatus,
                remainingAmount: previousRemainingAmount
            },
            newValue: {
                status: 'void',
                paymentStatus: 'cancelled',
                remainingAmount: 0,
                reason
            },
            transaction
        });

        if (stockMovements.length > 0) {
            await recordAudit(req, {
                action: 'restore_stock_void_sale',
                entity: 'StockMovement',
                entityId: sale.id,
                newValue: { saleId: sale.id, movements: stockMovements.length },
                transaction
            });
        }
    }

    return { sale, stockMovements };
}

module.exports = {
    PAYMENT_METHODS,
    settleDebt,
    syncCustomerDebt,
    voidTransaction,
    restoreSaleStock
};
