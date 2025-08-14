const {
    StockHistory
} = require('../models');

async function recordStockHistory({
    productId,
    type,
    qty,
    note = '',
    createdBy = 'system'
}) {
    if (!productId || !type || typeof qty !== 'number') {
        console.warn('recordStockHistory: data tidak lengkap', {
            productId,
            type,
            qty
        });
        return;
    }

    try {
        await StockHistory.create({
            productId,
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
