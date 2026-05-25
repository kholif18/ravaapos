// Cart/CartEvents - Event handling untuk interaksi cart
import {
    DOM
} from '../core/dom.js';
import {
    POS
} from '../core/state.js';
import {
    updateQuantity,
    updatePrice,
    updateItemDiscount,
    removeFromCart,
    clearCart
} from './cartManager.js';
import {
    renderCart,
    renderMobileCart
} from './cartRenderer.js';
import {
    formatRupiah,
    parseRupiahInput
} from '../utils/currency.js';
import {
    showWarning,
    showSuccess
} from '../ui/notifications.js';

// Track active row for keyboard navigation
let activeRowIndex = -1;
let activeRowElement = null;

export function initCartEvents() {
    bindGlobalCartEvents();
    bindKeyboardNavigation();
    bindDiscountEvents();
}

function bindGlobalCartEvents() {
    // Listen for cart updates from other modules
    document.addEventListener('cartUpdated', () => {
        renderCart();
        renderMobileCart();
    });

    document.addEventListener('clearCart', () => {
        clearCart();
    });

    document.addEventListener('voidLastItem', () => {
        if (POS.cart.length > 0) {
            const lastItem = POS.cart[POS.cart.length - 1];
            removeFromCart(lastItem.id);
            showSuccess(`Item ${lastItem.name} telah di-void`);
        } else {
            showWarning('Tidak ada item untuk di-void');
        }
    });
}

function bindDiscountEvents() {
    if (DOM.discountInput) {
        DOM.discountInput.addEventListener('input, change', (e) => {
            let value = parseInt(e.target.value) || 0;
            if (value < 0) value = 0;

            const maxDiscount = POS.getSubtotal();
            if (value > maxDiscount) {
                value = maxDiscount;
                e.target.value = value;
                showWarning(`Diskon tidak boleh melebihi subtotal (${formatRupiah(maxDiscount)})`);
            }

            POS.currentDiscount = value;
            const event = new CustomEvent('cartUpdated');
            document.dispatchEvent(event);
        });

        DOM.discountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                DOM.discountInput.blur();
            }
        });
    }
}

function bindKeyboardNavigation() {
    // Keyboard navigation for cart items
    document.addEventListener('keydown', (e) => {
        const cartItems = document.querySelectorAll('.cart-item');
        if (cartItems.length === 0) return;

        // Only handle if no input is focused
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );

        if (isInputFocused) return;

        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                navigateCartItems(-1, cartItems);
                break;
            case 'ArrowDown':
                e.preventDefault();
                navigateCartItems(1, cartItems);
                break;
            case 'Delete':
                e.preventDefault();
                if (activeRowElement) {
                    const id = parseInt(activeRowElement.dataset.id);
                    if (id) {
                        removeFromCart(id);
                        showSuccess('Item dihapus');
                    }
                }
                break;
            case 'e':
            case 'E':
                if (e.ctrlKey && activeRowElement) {
                    e.preventDefault();
                    const priceInput = activeRowElement.querySelector('.price-input');
                    if (priceInput) {
                        priceInput.focus();
                        priceInput.select();
                    }
                }
                break;
        }
    });
}

function navigateCartItems(direction, cartItems) {
    // Remove active class from current row
    if (activeRowElement) {
        activeRowElement.classList.remove('active-row');
    }

    // Calculate new index
    activeRowIndex += direction;
    if (activeRowIndex < 0) activeRowIndex = 0;
    if (activeRowIndex >= cartItems.length) activeRowIndex = cartItems.length - 1;

    // Get new active row
    activeRowElement = cartItems[activeRowIndex];
    if (activeRowElement) {
        activeRowElement.classList.add('active-row');
        activeRowElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }
}

// Event handlers for cart item interactions
export function handlePriceChange(itemId, newPrice) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci');
        return false;
    }

    if (newPrice > 0) {
        updatePrice(itemId, newPrice);
        return true;
    }
    return false;
}

export function handleQuantityChange(itemId, newQuantity) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci');
        return false;
    }

    if (newQuantity >= 1) {
        updateQuantity(itemId, newQuantity);
        return true;
    } else if (newQuantity === 0) {
        removeFromCart(itemId);
        return true;
    }
    return false;
}

export function handleDiscountChange(itemId, discountAmount) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci');
        return false;
    }

    const item = POS.cart.find(i => i.id === itemId);
    if (item) {
        const maxDiscount = item.price * item.quantity;
        const validDiscount = Math.min(discountAmount, maxDiscount);
        updateItemDiscount(itemId, validDiscount);
        return true;
    }
    return false;
}

export function handleBulkDiscount(type, value) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci');
        return;
    }

    switch (type) {
        case 'percentage':
            const percentage = Math.min(100, Math.max(0, value));
            const discountAmount = POS.getSubtotal() * (percentage / 100);
            POS.currentDiscount = discountAmount;
            if (DOM.discountInput) DOM.discountInput.value = discountAmount;
            break;
        case 'nominal':
            POS.currentDiscount = Math.min(value, POS.getSubtotal());
            if (DOM.discountInput) DOM.discountInput.value = POS.currentDiscount;
            break;
        default:
            return;
    }

    const event = new CustomEvent('cartUpdated');
    document.dispatchEvent(event);
    showSuccess(`Diskon ${formatRupiah(POS.currentDiscount)} diterapkan`);
}

// Export for resetting navigation state
export function resetCartNavigation() {
    activeRowIndex = -1;
    activeRowElement = null;
}