// Cart/CartKeyboard - Keyboard navigation for cart
import { POS } from '../core/state.js';
import { updateQuantity, removeFromCart } from './cartManager.js';
import { DOM } from '../core/dom.js';

let currentFocusIndex = -1;
let focusedItemId = null;
let isKeyboardNavActive = false;

export function initCartKeyboard() {
    document.addEventListener('keydown', handleCartKeyboard);
    
    // Reset focus when clicking on cart
    const cartContainer = DOM.cartItems;
    if (cartContainer) {
        cartContainer.addEventListener('click', () => {
            resetKeyboardFocus();
        });
    }
    
    // Focus management for inputs
    document.addEventListener('focusin', (e) => {
        if (e.target.classList?.contains('price-input') ||
            e.target.classList?.contains('qty-input') ||
            e.target.classList?.contains('disc-input')) {
            isKeyboardNavActive = false;
        }
    });
}

function handleCartKeyboard(e) {
    // Only handle if cart has items
    if (POS.cart.length === 0) return;
    
    // Don't interfere with input fields
    const activeElement = document.activeElement;
    if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    )) {
        return;
    }
    
    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            navigateCart(-1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            navigateCart(1);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            navigateWithinRow(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            navigateWithinRow(1);
            break;
        case 'Enter':
            e.preventDefault();
            activateFocusedField();
            break;
        case 'Delete':
        case 'Del':
            e.preventDefault();
            deleteFocusedItem();
            break;
        case ' ':
        case 'Space':
            e.preventDefault();
            if (focusedItemId) {
                const item = POS.cart.find(i => i.id === focusedItemId);
                if (item) {
                    // Toggle selection or quick action
                    highlightItem(focusedItemId);
                }
            }
            break;
        case '+':
        case '=':
            e.preventDefault();
            adjustQuantity(1);
            break;
        case '-':
        case '_':
            e.preventDefault();
            adjustQuantity(-1);
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            focusPriceField();
            break;
        case 'q':
        case 'Q':
            e.preventDefault();
            focusQuantityField();
            break;
        case 'd':
        case 'D':
            e.preventDefault();
            if (e.ctrlKey) {
                // Ctrl+D handled elsewhere for global discount
                return;
            }
            focusDiscountField();
            break;
    }
}

function navigateCart(direction) {
    const cartItems = document.querySelectorAll('.cart-item');
    if (cartItems.length === 0) return;
    
    // Remove current highlight
    if (focusedItemId) {
        removeHighlight(focusedItemId);
    }
    
    // Calculate new index
    const currentIndex = POS.cart.findIndex(i => i.id === focusedItemId);
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= POS.cart.length) newIndex = POS.cart.length - 1;
    
    const newItem = POS.cart[newIndex];
    if (newItem) {
        focusedItemId = newItem.id;
        currentFocusIndex = newIndex;
        highlightItem(focusedItemId);
        scrollToItem(focusedItemId);
    }
}

function navigateWithinRow(direction) {
    if (!focusedItemId) return;
    
    const row = document.querySelector(`.cart-item[data-id="${focusedItemId}"]`);
    if (!row) return;
    
    const focusableFields = row.querySelectorAll('.price-input, .qty-input, .disc-input');
    if (focusableFields.length === 0) return;
    
    // Find current focused field
    let currentIndex = -1;
    for (let i = 0; i < focusableFields.length; i++) {
        if (document.activeElement === focusableFields[i]) {
            currentIndex = i;
            break;
        }
    }
    
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= focusableFields.length) newIndex = focusableFields.length - 1;
    
    if (newIndex !== currentIndex) {
        focusableFields[newIndex].focus();
        focusableFields[newIndex].select();
    }
}

function activateFocusedField() {
    if (!focusedItemId) return;
    
    const row = document.querySelector(`.cart-item[data-id="${focusedItemId}"]`);
    if (!row) return;
    
    // Try to focus price first, then qty, then disc
    const priceInput = row.querySelector('.price-input');
    if (priceInput) {
        priceInput.focus();
        priceInput.select();
        return;
    }
    
    const qtyInput = row.querySelector('.qty-input');
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
        return;
    }
    
    const discInput = row.querySelector('.disc-input');
    if (discInput) {
        discInput.focus();
        discInput.select();
    }
}

function deleteFocusedItem() {
    if (focusedItemId) {
        removeFromCart(focusedItemId);
        resetKeyboardFocus();
    }
}

function adjustQuantity(delta) {
    if (!focusedItemId) return;
    
    const item = POS.cart.find(i => i.id === focusedItemId);
    if (item) {
        const newQty = item.quantity + delta;
        if (newQty >= 1) {
            updateQuantity(focusedItemId, newQty);
        } else if (newQty === 0) {
            removeFromCart(focusedItemId);
            resetKeyboardFocus();
        }
    }
}

function focusPriceField() {
    if (!focusedItemId) return;
    const row = document.querySelector(`.cart-item[data-id="${focusedItemId}"]`);
    const priceInput = row?.querySelector('.price-input');
    if (priceInput) {
        priceInput.focus();
        priceInput.select();
    }
}

function focusQuantityField() {
    if (!focusedItemId) return;
    const row = document.querySelector(`.cart-item[data-id="${focusedItemId}"]`);
    const qtyInput = row?.querySelector('.qty-input');
    if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
    }
}

function focusDiscountField() {
    if (!focusedItemId) return;
    const row = document.querySelector(`.cart-item[data-id="${focusedItemId}"]`);
    const discInput = row?.querySelector('.disc-input');
    if (discInput) {
        discInput.focus();
        discInput.select();
    }
}

function highlightItem(itemId) {
    const item = document.querySelector(`.cart-item[data-id="${itemId}"]`);
    if (item) {
        item.classList.add('keyboard-focus');
        item.style.borderLeft = '3px solid #696cff';
        item.style.backgroundColor = '#f0f7ff';
    }
}

function removeHighlight(itemId) {
    const item = document.querySelector(`.cart-item[data-id="${itemId}"]`);
    if (item) {
        item.classList.remove('keyboard-focus');
        item.style.borderLeft = '';
        item.style.backgroundColor = '';
    }
}

function scrollToItem(itemId) {
    const item = document.querySelector(`.cart-item[data-id="${itemId}"]`);
    if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

export function resetKeyboardFocus() {
    if (focusedItemId) {
        removeHighlight(focusedItemId);
    }
    focusedItemId = null;
    currentFocusIndex = -1;
    isKeyboardNavActive = true;
    
    // Focus first item if available
    if (POS.cart.length > 0) {
        focusedItemId = POS.cart[0].id;
        currentFocusIndex = 0;
        highlightItem(focusedItemId);
    }
}

// Get current focused item
export function getCurrentFocusItem() {
    return focusedItemId ? POS.cart.find(i => i.id === focusedItemId) : null;
}

// Enable/disable keyboard navigation
export function setKeyboardNavigation(enabled) {
    isKeyboardNavActive = enabled;
    if (!enabled) {
        resetKeyboardFocus();
    }
}