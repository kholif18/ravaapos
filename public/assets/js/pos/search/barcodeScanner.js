// Search/BarcodeScanner - Handle barcode scanning logic
import {
    addToCart
} from '../cart/cartManager.js';
import {
    showWarning,
    showSuccess
} from '../ui/notifications.js';
import {
    DOM
} from '../core/dom.js';

// Barcode scanner state
let barcodeBuffer = '';
let lastKeyTime = 0;
const TIMEOUT_MS = 50; // Time between keystrokes for barcode
const RESET_TIMEOUT_MS = 100; // Reset buffer after this time

let resetTimeout = null;

export function initBarcodeScanner() {
    bindBarcodeListener();
    initFocusManagement();
}

function bindBarcodeListener() {
    document.addEventListener('keydown', handleBarcodeInput);
}

function handleBarcodeInput(e) {
    // Only handle if not in input field (barcode scanner acts like keyboard)
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );

    // If input is focused, let normal typing happen
    if (isInputFocused) return;

    const now = Date.now();
    const timeDiff = now - lastKeyTime;

    // Reset buffer if too slow
    if (timeDiff > RESET_TIMEOUT_MS && barcodeBuffer.length > 0) {
        resetBarcodeBuffer();
    }

    lastKeyTime = now;

    // Handle Enter key (barcode complete)
    if (e.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
            e.preventDefault();
            processBarcode(barcodeBuffer);
            resetBarcodeBuffer();
        }
        return;
    }

    // Only process printable characters
    if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        e.preventDefault();
        barcodeBuffer += e.key;

        // Set timeout to reset if no Enter
        if (resetTimeout) clearTimeout(resetTimeout);
        resetTimeout = setTimeout(() => {
            resetBarcodeBuffer();
        }, RESET_TIMEOUT_MS);
    }
}

async function processBarcode(barcode) {
    console.log('Barcode scanned:', barcode);

    // Clear any previous timeout
    if (resetTimeout) {
        clearTimeout(resetTimeout);
        resetTimeout = null;
    }

    // Search product by barcode
    const product = await findProductByBarcode(barcode);

    if (product) {
        addToCart(product);
        showSuccess(`${product.name} ditambahkan ke keranjang`);

        // Optional: Play beep sound
        playBeep();
    } else {
        showWarning(`Barcode ${barcode} tidak ditemukan`);

        // Optional: Play error sound
        playErrorBeep();
    }
}

async function findProductByBarcode(barcode) {
    // First check from products loaded in productSearch module
    if (window.productList) {
        const product = window.productList.find(p => p.barcode === barcode);
        if (product) return product;
    }

    // Try to fetch from API
    try {
        const response = await fetch(`/api/products/barcode/${barcode}`);
        if (response.ok) {
            const product = await response.json();
            return product;
        }
    } catch (error) {
        console.error('API error:', error);
    }

    return null;
}

function resetBarcodeBuffer() {
    barcodeBuffer = '';
    if (resetTimeout) {
        clearTimeout(resetTimeout);
        resetTimeout = null;
    }
}

function playBeep() {
    // Simple beep using Web Audio API
    try {
        const audioContext = new(window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.1;

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        // Fallback: no sound
    }
}

function playErrorBeep() {
    try {
        const audioContext = new(window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.1;

        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // Fallback
    }
}

function initFocusManagement() {
    // Auto-focus search when page loads
    if (DOM.searchProduct) {
        DOM.searchProduct.addEventListener('focus', () => {
            // Clear buffer when focusing search
            resetBarcodeBuffer();
        });
    }

    // Prevent barcode scanning when modal is open
    document.addEventListener('modalOpened', () => {
        // Temporarily disable barcode scanning
        document.removeEventListener('keydown', handleBarcodeInput);
    });

    document.addEventListener('modalClosed', () => {
        // Re-enable barcode scanning
        bindBarcodeListener();
    });
}

// Export for manual barcode input
export function manualBarcodeInput(barcode) {
    if (barcode && barcode.trim()) {
        processBarcode(barcode.trim());
    }
}

export function resetScanner() {
    resetBarcodeBuffer();
}