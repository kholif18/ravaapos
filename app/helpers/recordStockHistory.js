// helpers/recordStockHistory.js
const {
    StockHistory
} = require('../models');

async function recordStockHistory({
    productId,
    type,
    qty,
    note,
    createdBy
}) {
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
