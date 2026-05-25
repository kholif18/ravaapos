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
    initProductSearch,
    refocusProductSearch
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

    // Initialize invoice from DOM
    if (DOM.currentInvoice) {
        POS.currentInvoice = DOM.currentInvoice.textContent.trim();
    }

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

    focusOnSearch();
    refocusProductSearch();
    
    console.log('POS System initialized');
}

function initTimeUpdater() {
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
}

function focusOnSearch() {
    // Method 1: Langsung fokus ke input search
    if (DOM.searchProduct) {
        // Fokus setelah DOM benar-benar siap
        setTimeout(() => {
            DOM.searchProduct.focus();
            DOM.searchProduct.select(); // Select semua teks jika ada
        }, 100);
    }

    // Method 2: Untuk mobile
    if (DOM.mobileSearchProduct && window.innerWidth < 768) {
        setTimeout(() => {
            DOM.mobileSearchProduct.focus();
        }, 100);
    }

    // Method 3: Fallback jika menggunakan element lain
    const searchInput = document.querySelector('#searchProduct, #mobileSearchProduct, .search-input');
    if (searchInput && searchInput !== DOM.searchProduct) {
        setTimeout(() => {
            searchInput.focus();
        }, 150);
    }
}

// Export untuk dipanggil dari file lain jika perlu
export function refocusOnSearch() {
    focusOnSearch();
}