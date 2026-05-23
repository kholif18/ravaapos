// /public/assets/js/product/productUIRules.js

export const PRODUCT_UI_RULES = {
    fisik: {
        stockVisible: true,
        costEnabled: true,
        markupEnabled: true,
        salePriceEnabled: true,
        requireQtyInput: true,
        priceChangeAllowed: true,
        lowStock: true,
        tax: true,
        reorderPointEnabled: true,
        preferredQtyEnabled: true,
        defaultValues: {
            cost: null,
            markup: null,
            stock: null,
            reorderPoint: null,
            preferredQty: null
        }
    },

    service: {
        stockVisible: false,
        costEnabled: true,
        markupEnabled: true,
        salePriceEnabled: true,
        requireQtyInput: true,
        priceChangeAllowed: true,
        lowStock: false,
        tax: true,
        reorderPointEnabled: false,
        preferredQtyEnabled: false,
        defaultValues: {
            cost: 0,
            markup: 0,
            stock: 0,
            reorderPoint: 0,
            preferredQty: 0
        }
    },

    ppob: {
        stockVisible: false,
        costEnabled: true,
        markupEnabled: true,
        salePriceEnabled: true,
        requireQtyInput: false,
        priceChangeAllowed: true,
        lowStock: false,
        tax: false,
        reorderPointEnabled: false,
        preferredQtyEnabled: false,
        defaultValues: {
            stock: 0,
            reorderPoint: 0,
            preferredQty: 0
        }
    }
};

// Field mapping untuk create & edit
export const FIELD_MAPPING = {
    // Create mode: element ID
    create: {
        cost: 'inputCost',
        markup: 'inputMarkup',
        salePrice: 'inputSalePrice',
        stockSection: 'stockSectionCreate',
        requireQty: 'requireQtyInput',
        priceChange: 'priceChangeAllowed',
        reorderPoint: 'reorderPoint',
        preferredQty: 'preferredQty',
        lowStockWarning: 'lowStockWarning',
        lowStockThreshold: 'lowStockThreshold',
        taxCheckbox: 'enableInputTax',
        taxInput: 'tax',
        type: 'productType',
        name: 'inputName',
        code: 'productCode',
        barcode: 'inputBarcode',
        unit: 'unit',
        category: 'categorySelect',
        supplier: 'supplierSelect'
    },
    // Edit mode: tambahkan prefix 'edit'
    edit: {
        cost: 'editInputCost',
        markup: 'editInputMarkup',
        salePrice: 'editInputSalePrice',
        stockSection: 'stockSectionEdit',
        requireQty: 'editRequireQtyInput',
        priceChange: 'editPriceChangeAllowed',
        reorderPoint: 'editReorderPoint',
        preferredQty: 'editPreferredQty',
        lowStockWarning: 'editEnableLowStockWarning',
        lowStockThreshold: 'editLowStockThreshold',
        taxCheckbox: 'editEnableInputTax',
        taxInput: 'editTax',
        type: 'editProductType',
        name: 'editInputName',
        code: 'editProductCode',
        barcode: 'editInputBarcode',
        unit: 'editUnit',
        category: 'editCategorySelect',
        supplier: 'editSupplierSelect'
    }
};

export function getFieldId(fieldName, context = 'create') {
    return FIELD_MAPPING[context]?.[fieldName] || null;
}

export function getElement(fieldName, context = 'create') {
    const id = getFieldId(fieldName, context);
    return id ? document.getElementById(id) : null;
}