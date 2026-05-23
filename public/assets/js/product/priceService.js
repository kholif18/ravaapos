// public/assets/js/priceService.js

export function calcSale(cost, markup) {
    cost = parseFloat(cost) || 0;
    markup = parseFloat(markup) || 0;
    return cost + (cost * markup / 100);
}

export function calcMarkup(cost, sale) {
    cost = parseFloat(cost) || 0;
    sale = parseFloat(sale) || 0;
    if (!cost) return 0;
    return ((sale - cost) / cost) * 100;
}

export function bindPriceSync(costEl, markupEl, saleEl) {
    let last = null;

    costEl.addEventListener('input', () => {
        if (last === 'sale') return;
        saleEl.value = calcSale(costEl.value, markupEl.value).toFixed(2);
        last = 'markup';
    });

    markupEl.addEventListener('input', () => {
        if (last === 'sale') return;
        saleEl.value = calcSale(costEl.value, markupEl.value).toFixed(2);
        last = 'markup';
    });

    saleEl.addEventListener('input', () => {
        if (last === 'markup') return;
        markupEl.value = calcMarkup(costEl.value, saleEl.value).toFixed(2);
        last = 'sale';
    });
}

export function initPriceSync(costEl, markupEl, saleEl) {
    const cost = parseFloat(costEl.value) || 0;
    const markup = parseFloat(markupEl.value) || 0;

    if (cost && markup) {
        saleEl.value = calcSale(cost, markup).toFixed(2);
    }
}