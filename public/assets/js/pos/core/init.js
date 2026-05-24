// Core/Init
import {
    DOM
} from './dom.js';
import {
    POS
} from './state.js';
import {
    initKeyboardShortcuts
} from '../ui/shortcuts.js';
import {
    initSlidePanel
} from '../ui/slidePanel.js';
import {
    initCustomerSearch
} from '../customer/customerSearch.js';
import {
    initProductSearch
} from '../search/productSearch.js';
import {
    initPaymentHandlers
} from '../payment/paymentModal.js';

// Hanya 1 deklarasi updateTime
function updateTimeDisplay() {
    if (DOM.currentTime) {
        DOM.currentTime.textContent = new Date().toLocaleTimeString('id-ID');
    }
}

export function initGlobalState() {
    // Initialize all modules
    initKeyboardShortcuts();
    initSlidePanel();
    initCustomerSearch();
    initProductSearch();
    initPaymentHandlers();
    initTimeUpdater();

    // Set initial discount input listener
    if (DOM.discountInput) {
        DOM.discountInput.addEventListener('input', (e) => {
            POS.currentDiscount = parseInt(e.target.value) || 0;
            // Trigger re-render
            const event = new CustomEvent('cartUpdated');
            document.dispatchEvent(event);
        });
    }

    console.log('POS System initialized');
}

function initTimeUpdater() {
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
}
