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
            resetStock: false
        },
        tax: {
            allow: false
        }
    },

    service: {
        pricing: {
            allowCost: false,
            allowMarkup: false,
            minSalePrice: 1,
            forceCost: true,
            forceMarkup: true
        },
        stock: {
            resetStock: true
        },
        tax: {
            allow: false
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
            resetStock: true
        },
        tax: {
            allow: false
        }
    }
};

module.exports = PRODUCT_RULES;