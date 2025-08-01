export function formatRupiah(value, prefix = 'Rp') {
    const number = parseInt(value, 10);
    if (isNaN(number)) return value;

    return `${prefix} ${number.toLocaleString('id-ID')}`;
}
