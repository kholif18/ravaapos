// Utils/Helpers
export function truncateText(text, maxLength = 30) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export function generateTransactionId() {
    return 'INV-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
}

export function getCurrentDateTime() {
    return new Date().toLocaleString('id-ID');
}