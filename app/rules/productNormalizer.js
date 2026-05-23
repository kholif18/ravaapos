// rules/productNormalizer.js

const {
    PRODUCT_RULES,
    isStockAllowed,
    isTaxAllowed,
    isLowStockAllowed,
    shouldResetStock,
    getMinSalePrice
} = require('./productRules');

function toNumber(v, fallback = 0) {
    const n = Number(v);
    return isNaN(n) ? fallback : n;
}

function toInt(v, fallback = 0) {
    const n = parseInt(v);
    return isNaN(n) ? fallback : n;
}

function normalizeProduct(type, body) {
    const rule = PRODUCT_RULES[type];
    if (!rule) throw new Error('Invalid type');

    // Pricing fields
    let cost = toNumber(body.cost);
    let markup = toNumber(body.markup);
    let salePrice = toNumber(body.salePrice);

    // Stock fields (hanya untuk fisik)
    let reorderPoint = 0;
    let preferredQty = 0;
    let stock = 0;

    if (isStockAllowed(type)) {
        reorderPoint = toInt(body.reorderPoint);
        preferredQty = toInt(body.preferredQty);
        stock = toInt(body.stock);
    } else if (shouldResetStock(type)) {
        // Untuk service & ppob, stock tetap 0
        reorderPoint = 0;
        preferredQty = 0;
        stock = 0;
    }

    // Tax fields
    let tax = null;
    if (isTaxAllowed(type)) {
        const taxEnabled = body.enableInputTax === true ||
            body.enableInputTax === 'true' ||
            body.enableInputTax === 'on';
        if (taxEnabled) {
            tax = toNumber(body.tax, null);
        }
    }

    // Low stock warning
    let lowStockWarning = false;
    let lowStockThreshold = null;

    if (isLowStockAllowed(type)) {
        lowStockWarning = body.lowStockWarning === true ||
            body.lowStockWarning === 'true' ||
            body.lowStockWarning === 'on';
        lowStockThreshold = lowStockWarning ? toInt(body.lowStockThreshold, null) : null;
    }

    // Force values berdasarkan rules
    if (rule.pricing.forceCost) cost = 0;
    if (rule.pricing.forceMarkup) markup = 0;
    if (!rule.pricing.allowCost) cost = 0;
    if (!rule.pricing.allowMarkup) markup = 0;

    // Validasi min sale price
    const minSalePrice = getMinSalePrice(type);
    if (salePrice < minSalePrice) {
        throw new Error(`MIN_SALE_PRICE:${minSalePrice}`);
    }

    return {
        cost,
        markup,
        salePrice,
        tax,
        lowStockWarning,
        lowStockThreshold,
        reorderPoint,
        preferredQty,
        stock
    };
}

module.exports = {
    normalizeProduct
};