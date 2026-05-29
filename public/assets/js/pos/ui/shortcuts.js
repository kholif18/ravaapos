// UI/Shortcuts
import { DOM } from '../core/dom.js';

export function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // F1: Focus search
        if (e.key === 'F1') {
            e.preventDefault();
            DOM.searchProduct?.focus();
            DOM.searchProduct?.select();
        }
        
        // F2: Open customer search
        if (e.key === 'F2') {
            e.preventDefault();
            DOM.customerSelectorCard?.click();
        }
        
        // F3: Clear cart
        if (e.key === 'F3') {
            e.preventDefault();
            DOM.clearCartBtn?.click();
        }
        
        // F4: Checkout
        if (e.key === 'F4') {
            e.preventDefault();
            DOM.completeOrderBtn?.click();
        }
        
        // Ctrl + S: Hold Transaction
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            DOM.holdTransactionBtn?.click();
        }

        // Ctrl + H: Resume Transaction
        if (e.ctrlKey && e.key.toLowerCase() === 'h') {
            e.preventDefault();
            DOM.resumeTransactionBtn?.click();
        }

        // F8: Open menu
        if (e.key === 'F8') {
            e.preventDefault();
            DOM.openSlidePanelBtn?.click();
        }
        
        // F9: Direct Cash payment (Uang Pas)
        if (e.key === 'F9') {
            e.preventDefault();
            DOM.cashPaymentBtn?.click();
        }
        
        // F10: Void transaction
        if (e.key === 'F10') {
            e.preventDefault();
            DOM.voidTransactionBtn?.click();
        }

        // Ctrl + R: Refund
        if (e.ctrlKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            DOM.refundBtn?.click();
        }

        // Ctrl + O: Open Drawer
        if (e.ctrlKey && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            DOM.openDrawerBtn?.click();
        }
        
        // Ctrl+D: Discount
        if (e.ctrlKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            DOM.discountInput?.focus();
            DOM.discountInput?.select();
        }
    });
}