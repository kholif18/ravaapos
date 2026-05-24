// Core/State
import {
    CONFIG
} from './config.js';

export const POS = {
    cart: [],
    selectedCustomer: null,
    currentDiscount: 0,
    transactionLocked: false,
    currentTransactionId: null,
    holdSales: [],

    // Methods
    reset() {
        this.cart = [];
        this.selectedCustomer = null;
        this.currentDiscount = 0;
        this.transactionLocked = false;
        this.currentTransactionId = null;
    },

    getSubtotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    getAfterDiscount() {
        return Math.max(0, this.getSubtotal() - this.currentDiscount);
    },

    getTax() {
        return Math.round(this.getAfterDiscount() * (CONFIG.taxRate / 100));
    },

    getTotal() {
        return this.getAfterDiscount() + this.getTax();
    }
};