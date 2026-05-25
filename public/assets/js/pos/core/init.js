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
import {
    renderCart,
    renderMobileCart
} from '../cart/cartRenderer.js';

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

    // Initial Render for persisted cart
    renderCart();
    renderMobileCart();

    // Set initial discount input listener
    if (DOM.discountInput) {
        DOM.discountInput.value = POS.currentDiscount || 0;
        DOM.discountInput.addEventListener('input', (e) => {
            POS.currentDiscount = parseInt(e.target.value) || 0;
            POS.saveToStorage();
            // Trigger re-render
            renderCart();
            renderMobileCart();
        });
    }

    console.log('POS System initialized');
}

function initTimeUpdater() {
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
}
