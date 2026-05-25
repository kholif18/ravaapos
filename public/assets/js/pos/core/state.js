// Core/State

const STORAGE_KEY = 'rava_pos_cart_state';

// Load initial state from localStorage
const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

export const POS = {
    cart: savedState.cart || [],
    selectedCustomer: savedState.selectedCustomer || null,
    currentDiscount: savedState.currentDiscount || 0,
    currentInvoice: null,
    transactionLocked: false,
    currentTransactionId: null,
    holdSales: [],

    setInvoice(invoice) {
        this.currentInvoice = invoice;
        const invoiceEl = document.getElementById('currentInvoice');
        if (invoiceEl) {
            invoiceEl.textContent = invoice;
        }
    },

    // Persistence
    saveToStorage() {
        const stateToSave = {
            cart: this.cart,
            selectedCustomer: this.selectedCustomer,
            currentDiscount: this.currentDiscount
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    },

    clearStorage() {
        localStorage.removeItem(STORAGE_KEY);
    },

    // Methods
    reset() {
        this.cart = [];
        this.selectedCustomer = null;
        this.currentDiscount = 0;
        this.transactionLocked = false;
        this.currentTransactionId = null;
        this.clearStorage();
    },

    getSubtotal() {
        return this.cart.reduce((sum, item) => {
            const itemTotal = Math.max(0, (item.price * item.quantity) - (item.discount || 0));
            return sum + itemTotal;
        }, 0);
    },

    getAfterDiscount() {
        return Math.max(0, this.getSubtotal() - this.currentDiscount);
    },

    getTax() {
        return this.calculateTotals().taxAmount;
    },

    getTotal() {
        return this.calculateTotals().total;
    },

    calculateTotals() {
        let subtotal = 0;
        let taxAmount = 0;
        const globalDiscount = Number(this.currentDiscount) || 0;

        this.cart.forEach(item => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const itemDiscount = Number(item.discount) || 0;
            const itemSubtotalBeforeDiscount = price * quantity;
            const itemSubtotal = Math.max(0, itemSubtotalBeforeDiscount - itemDiscount);
            const itemTaxRate = Number(item.tax) || 0;

            subtotal += itemSubtotal;

            if (itemTaxRate > 0) {
                taxAmount += itemSubtotalBeforeDiscount * (itemTaxRate / 100);
            }
        });

        taxAmount = Math.round(taxAmount);
        const afterDiscount = Math.max(0, subtotal - globalDiscount);
        const total = Math.max(0, subtotal + taxAmount - globalDiscount);
        
        return {
            subtotal,
            afterDiscount,
            taxAmount,
            globalDiscount,
            total
        };
    }
};
