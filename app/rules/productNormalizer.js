// rules/productNormalizer.js
const PRODUCT_RULES = require('./productRules');

function toNumber(v, fallback = 0) {
    const n = Number(v);
    return isNaN(n) ? fallback : n;
}

function normalizeProduct(type, body) {
    const rule = PRODUCT_RULES[type];
    if (!rule) throw new Error('Invalid type');

    let cost = toNumber(body.cost);
    let markup = toNumber(body.markup);
    let salePrice = toNumber(body.salePrice);
    let tax = body.tax !== undefined ? toNumber(body.tax, null) : null;

    // RULE ENFORCEMENT (SATU TEMPAT SAJA)
    if (rule.forceCost) cost = 0;
    if (rule.forceMarkup) markup = 0;

    if (!rule.allowCost) cost = 0;
    if (!rule.allowMarkup) markup = 0;

    const lowStockWarning = body.lowStockWarning === true || body.lowStockWarning === 'true' || body.lowStockWarning === 'on';
    const lowStockThreshold = lowStockWarning ? toNumber(body.lowStockThreshold, null) : null;

    const taxEnabled = body.enableInputTax === true || body.enableInputTax === 'true' || body.enableInputTax === 'on';
    tax = taxEnabled ? tax : null;

    if (salePrice < rule.minSalePrice) {
        throw new Error(`MIN_SALE_PRICE:${rule.minSalePrice}`);
    }

    return {
        cost,
        markup,
        salePrice,
        tax,
        lowStockWarning,
        lowStockThreshold
    };
}

module.exports = {
    normalizeProduct
};