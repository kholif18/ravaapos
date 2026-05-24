// Utils/Currency
export function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export function parseRupiahInput(value) {
    if (!value) return 0;
    const numeric = String(value).replace(/[^0-9]/g, '');
    return parseInt(numeric, 10) || 0;
}