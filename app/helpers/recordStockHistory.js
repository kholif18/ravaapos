const {
    StockHistory
} = require('../models');

async function recordStockHistory({
    productId,
    purchasingId = null,
    type,
    qty,
    note = '',
    createdBy = 'system'
}) {
    if (!productId || !type || typeof qty !== 'number') {
        console.warn('recordStockHistory: data tidak lengkap', {
            productId,
            purchasingId,
            type,
            qty
        });
        return;
    }

    // Pastikan qty untuk return negatif
    if (type === 'return' && qty > 0) {
        qty = -qty;
    }

    try {
        await StockHistory.create({
            productId,
            purchasingId,
            type,
            qty,
            note,
            createdBy
        });
    } catch (err) {
        console.error('Gagal mencatat history stok:', err);
    }
}

module.exports = {
    recordStockHistory
};
