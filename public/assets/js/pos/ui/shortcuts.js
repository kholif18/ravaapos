// UI/Shortcuts
import { POS } from '../core/state.js';
import { DOM } from '../core/dom.js';

export function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // F1: Focus search
        if (e.key === 'F1') {
            e.preventDefault();
            DOM.searchProduct?.focus();
        }
        
        // F2: Open customer search
        if (e.key === 'F2') {
            e.preventDefault();
            const event = new CustomEvent('openCustomerSearch');
            document.dispatchEvent(event);
        }
        
        // F3: Clear cart
        if (e.key === 'F3') {
            e.preventDefault();
            const event = new CustomEvent('clearCart');
            document.dispatchEvent(event);
        }
        
        // F4: Checkout
        if (e.key === 'F4') {
            e.preventDefault();
            DOM.completeOrderBtn?.click();
        }
        
        // F8: Open menu
        if (e.key === 'F8') {
            e.preventDefault();
            DOM.openSlidePanelBtn?.click();
        }
        
        // F9: Cash payment
        if (e.key === 'F9') {
            e.preventDefault();
            DOM.cashPaymentBtn?.click();
        }
        
        // F10: Void item
        if (e.key === 'F10') {
            e.preventDefault();
            const event = new CustomEvent('voidLastItem');
            document.dispatchEvent(event);
        }
        
        // Ctrl+D: Discount
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            DOM.discountInput?.focus();
        }
    });
}