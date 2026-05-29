// /public/assets/js/product/productTypeUI.js

import { PRODUCT_UI_RULES, getElement } from './productUIRules.js';

/**
 * Apply UI rules based on product type
 * Single source of truth - no scattered logic
 */
export function applyProductTypeRules(context = 'create', preserveValues = false) {
    const typeSelect = getElement('type', context);
    if (!typeSelect) return;

    const type = typeSelect.value;
    const rule = PRODUCT_UI_RULES[type] || PRODUCT_UI_RULES.fisik;

    // Get all elements once
    const elements = {
        cost: getElement('cost', context),
        markup: getElement('markup', context),
        salePrice: getElement('salePrice', context),
        stockSection: getElement('stockSection', context),
        priceChange: getElement('priceChange', context),
        reorderPoint: getElement('reorderPoint', context),
        preferredQty: getElement('preferredQty', context),
        lowStockWarning: getElement('lowStockWarning', context),
        lowStockThreshold: getElement('lowStockThreshold', context),
        taxCheckbox: getElement('taxCheckbox', context),
        taxInput: getElement('taxInput', context)
    };

    // 1. Stock Section Visibility
    if (elements.stockSection) {
        elements.stockSection.style.display = rule.stockVisible ? '' : 'none';
    }

    // 2. Cost Field
    if (elements.cost) {
        elements.cost.disabled = !rule.costEnabled;
        elements.cost.required = rule.costEnabled;
        if (!preserveValues) {
            if (rule.defaultValues?.cost !== undefined && context === 'create') {
                elements.cost.value = rule.defaultValues.cost;
            }
        }
    }

    // 3. Markup Field
    if (elements.markup) {
        elements.markup.disabled = !rule.markupEnabled;
        elements.markup.required = rule.markupEnabled;
        if (!preserveValues) {
            if (rule.defaultValues?.markup !== undefined && context === 'create') {
                elements.markup.value = rule.defaultValues.markup;
            }
        }
    }

    // 4. Sale Price Field
    if (elements.salePrice) {
        elements.salePrice.disabled = !rule.salePriceEnabled;
        elements.salePrice.required = rule.salePriceEnabled;
    }

    // 6. Price Change Allowed
    if (elements.priceChange) {
        elements.priceChange.disabled = false;
        // PPOB always has price change allowed
        if (type === 'ppob') {
            elements.priceChange.checked = true;
            elements.priceChange.disabled = true;
        }
    }

    // 7. Reorder Point
    if (elements.reorderPoint) {
        elements.reorderPoint.disabled = !rule.reorderPointEnabled;
    }

    // 8. Preferred Quantity
    if (elements.preferredQty) {
        elements.preferredQty.disabled = !rule.preferredQtyEnabled;
    }

    // 9. Low Stock Warning
    if (elements.lowStockWarning) {
        elements.lowStockWarning.disabled = !rule.lowStock;
        if (!rule.lowStock) {
            elements.lowStockWarning.checked = false;
        }
    }

    // 10. Low Stock Threshold
    if (elements.lowStockThreshold) {
        const isLowStockEnabled = rule.lowStock && elements.lowStockWarning?.checked;
        elements.lowStockThreshold.disabled = !isLowStockEnabled;
        if (!isLowStockEnabled) {
            elements.lowStockThreshold.value = '';
        }
    }

    // 11. Tax Checkbox
    if (elements.taxCheckbox) {
        elements.taxCheckbox.disabled = !rule.tax;
        if (!rule.tax) {
            elements.taxCheckbox.checked = false;
        }
    }

    // 12. Tax Input
    if (elements.taxInput) {
        const isTaxEnabled = rule.tax && elements.taxCheckbox?.checked;
        elements.taxInput.disabled = !isTaxEnabled;
        if (!isTaxEnabled) {
            elements.taxInput.value = '';
        }
    }
}

/**
 * Setup event listener for product type change
 */
export function initProductTypeListener(context = 'create') {
    const typeSelect = getElement('type', context);
    if (!typeSelect) return;

    // Remove existing listener to avoid duplicates
    const newTypeSelect = typeSelect.cloneNode(true);
    typeSelect.parentNode.replaceChild(newTypeSelect, typeSelect);

    newTypeSelect.addEventListener('change', () => {
        applyProductTypeRules(context, false);
    });

    // Apply initial rules
    const isEditMode = context === 'edit';
    applyProductTypeRules(context, !isEditMode);
}

/**
 * Setup toggle listeners (low stock & tax)
 */
export function initToggleListeners(context = 'create') {
    // Low Stock Toggle
    const lowStockCheckbox = getElement('lowStockWarning', context);
    const lowStockThreshold = getElement('lowStockThreshold', context);
    
    if (lowStockCheckbox && lowStockThreshold) {
        const newCheckbox = lowStockCheckbox.cloneNode(true);
        lowStockCheckbox.parentNode.replaceChild(newCheckbox, lowStockCheckbox);
        
        newCheckbox.addEventListener('change', () => {
            lowStockThreshold.disabled = !newCheckbox.checked;
            if (!newCheckbox.checked) {
                lowStockThreshold.value = '';
            }
        });
    }

    // Tax Toggle
    const taxCheckbox = getElement('taxCheckbox', context);
    const taxInput = getElement('taxInput', context);
    
    if (taxCheckbox && taxInput) {
        const newTaxCheckbox = taxCheckbox.cloneNode(true);
        taxCheckbox.parentNode.replaceChild(newTaxCheckbox, taxCheckbox);
        
        newTaxCheckbox.addEventListener('change', () => {
            taxInput.disabled = !newTaxCheckbox.checked;
            if (!newTaxCheckbox.checked) {
                taxInput.value = '';
            }
        });
    }
}