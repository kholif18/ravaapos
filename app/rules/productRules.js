// rules/productRules.js

const PRODUCT_RULES = {
    fisik: {
        pricing: {
            allowCost: true,
            allowMarkup: true,
            minSalePrice: 1,
            forceCost: false,
            forceMarkup: false
        },
        stock: {
            allow: true,
            resetStock: false,
            allowReorderPoint: true,
            allowPreferredQty: true
        },
        tax: {
            allow: true
        },
        lowStock: {
            allow: true
        },
        pos: {
            priceChangeAllowed: true
        }
    },

    service: {
        pricing: {
            allowCost: true,
            allowMarkup: true,
            minSalePrice: 1,
            forceCost: false,
            forceMarkup: false
        },
        stock: {
            allow: false,
            resetStock: true,
            allowReorderPoint: false,
            allowPreferredQty: false
        },
        tax: {
            allow: true
        },
        lowStock: {
            allow: false
        },
        pos: {
            priceChangeAllowed: true
        }
    },

    ppob: {
        pricing: {
            allowCost: true,
            allowMarkup: true,
            minSalePrice: 0,
            forceCost: false,
            forceMarkup: false
        },
        stock: {
            allow: false,
            resetStock: true,
            allowReorderPoint: false,
            allowPreferredQty: false
        },
        tax: {
            allow: false
        },
        lowStock: {
            allow: false
        },
        pos: {
            priceChangeAllowed: true
        }
    }
};

// Helper functions
function getRule(type, category, field = null) {
    const rule = PRODUCT_RULES[type];
    if (!rule) return null;

    if (category && field) {
        return rule[category]?.[field];
    }
    if (category) {
        return rule[category];
    }
    return rule;
}

function isStockAllowed(type) {
    return getRule(type, 'stock', 'allow') === true;
}

function isTaxAllowed(type) {
    return getRule(type, 'tax', 'allow') === true;
}

function isLowStockAllowed(type) {
    return getRule(type, 'lowStock', 'allow') === true;
}

function shouldResetStock(type) {
    return getRule(type, 'stock', 'resetStock') === true;
}

function getMinSalePrice(type) {
    return getRule(type, 'pricing', 'minSalePrice') || 0;
}

module.exports = {
    PRODUCT_RULES,
    getRule,
    isStockAllowed,
    isTaxAllowed,
    isLowStockAllowed,
    shouldResetStock,
    getMinSalePrice
};