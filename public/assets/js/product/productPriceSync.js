// /public/assets/js/product/productPriceSync.js

import { getElement } from './productUIRules.js';

let lastChanged = null;

/**
 * Update sale price based on cost and markup
 */
function updateSalePrice(context = 'create') {
    if (lastChanged === 'sale') return;
    
    const cost = parseFloat(getElement('cost', context)?.value) || 0;
    const markup = parseFloat(getElement('markup', context)?.value) || 0;
    const sale = cost + (cost * markup / 100);
    
    lastChanged = 'markup';
    const salePriceInput = getElement('salePrice', context);
    if (salePriceInput) {
        salePriceInput.value = Number.isInteger(sale) ? sale : sale.toFixed(2);
    }
}

/**
 * Update markup based on cost and sale price
 */
function updateMarkup(context = 'create') {
    if (lastChanged === 'markup') return;
    
    const cost = parseFloat(getElement('cost', context)?.value) || 0;
    const sale = parseFloat(getElement('salePrice', context)?.value) || 0;
    
    if (cost === 0) return;
    
    const markup = ((sale - cost) / cost) * 100;
    lastChanged = 'sale';
    
    const markupInput = getElement('markup', context);
    if (markupInput) {
        markupInput.value = Number.isInteger(markup) ? markup : markup.toFixed(2);
    }
}

/**
 * Initialize price sync for a form context
 */
export function initPriceSync(context = 'create') {
    const costInput = getElement('cost', context);
    const markupInput = getElement('markup', context);
    const salePriceInput = getElement('salePrice', context);
    
    if (!costInput || !markupInput || !salePriceInput) return;

    // Reset lastChanged
    lastChanged = null;

    // Remove old listeners by cloning
    const newCost = costInput.cloneNode(true);
    const newMarkup = markupInput.cloneNode(true);
    const newSalePrice = salePriceInput.cloneNode(true);
    
    costInput.parentNode.replaceChild(newCost, costInput);
    markupInput.parentNode.replaceChild(newMarkup, markupInput);
    salePriceInput.parentNode.replaceChild(newSalePrice, salePriceInput);

    // Re-assign to global elements
    const finalCost = getElement('cost', context);
    const finalMarkup = getElement('markup', context);
    const finalSalePrice = getElement('salePrice', context);

    // Add event listeners
    finalCost?.addEventListener('input', () => {
        lastChanged = null;
        updateSalePrice(context);
    });
    
    finalMarkup?.addEventListener('input', () => {
        lastChanged = null;
        updateSalePrice(context);
    });
    
    finalSalePrice?.addEventListener('input', () => {
        lastChanged = null;
        updateMarkup(context);
    });
}