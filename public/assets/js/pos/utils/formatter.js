// Utils/Formatter - Format berbagai tipe data
import {
    CONFIG
} from '../core/config.js';

/**
 * Format currency ke Rupiah
 */
export function formatCurrency(amount, symbol = true) {
    if (amount === undefined || amount === null) amount = 0;

    const formatted = new Intl.NumberFormat(CONFIG.currencyLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);

    return symbol ? `${CONFIG.currencySymbol} ${formatted}` : formatted;
}

/**
 * Format currency tanpa symbol (untuk input)
 */
export function formatCurrencyPlain(amount) {
    return new Intl.NumberFormat(CONFIG.currencyLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format tanggal
 */
export function formatDate(date, format = 'full') {
    const d = date instanceof Date ? date : new Date(date);

    switch (format) {
        case 'full':
            return d.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        case 'date':
            return d.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        case 'time':
            return d.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'datetime':
            return d.toLocaleString('id-ID', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'filename':
            return d.toISOString().slice(0, 19).replace(/:/g, '-');
        default:
            return d.toLocaleDateString('id-ID');
    }
}

/**
 * Format nomor telepon
 */
export function formatPhoneNumber(phone) {
    if (!phone) return '-';

    // Clean the number
    let cleaned = phone.replace(/\D/g, '');

    // Format based on length
    if (cleaned.length === 11 || cleaned.length === 12) {
        if (cleaned.startsWith('62')) {
            return cleaned.replace(/(62)(\d{3})(\d{4})(\d{4})/, '+$1 $2-$3-$4');
        } else if (cleaned.startsWith('0')) {
            return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
        }
    }

    return cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
}

/**
 * Format barcode (tampilkan sebagian)
 */
export function formatBarcode(barcode, showFull = false) {
    if (!barcode) return '-';
    if (showFull) return barcode;
    return `...${barcode.slice(-6)}`;
}

/**
 * Format nomor invoice
 */
export function formatInvoiceNumber(invoice) {
    if (!invoice) return '-';
    return invoice;
}

/**
 * Format persentase
 */
export function formatPercentage(value, total, decimals = 1) {
    if (!total || total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format number dengan separator ribuan
 */
export function formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat(CONFIG.currencyLocale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

/**
 * Format ukuran file
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format durasi (detik ke menit:detik)
 */
export function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format status transaksi
 */
export function formatTransactionStatus(status) {
    const statusMap = {
        'pending': '⏳ Pending',
        'completed': '✅ Selesai',
        'void': '❌ Void',
        'held': '📌 Ditahan',
        'refunded': '↩️ Refund'
    };
    return statusMap[status] || status;
}

/**
 * Format payment method
 */
export function formatPaymentMethod(method) {
    const methodMap = {
        'cash': '💰 Tunai',
        'card': '💳 Kartu',
        'qris': '📱 QRIS',
        'transfer': '🏦 Transfer',
        'ewallet': '📱 E-Wallet'
    };
    return methodMap[method] || method;
}