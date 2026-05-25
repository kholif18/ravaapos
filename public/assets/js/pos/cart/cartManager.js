// Cart/CartManager
import {
    POS
} from '../core/state.js';
import {
    renderCart,
    renderMobileCart
} from './cartRenderer.js';
import {
    showSuccess,
    showWarning
} from '../ui/notifications.js';
import {
    DOM
} from '../core/dom.js';

export function addToCart(product, quantity = 1) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci, tidak bisa menambah item');
        return false;
    }

    const canMerge = !product.priceChangeAllowed &&
        !product.requireQtyInput &&
        !product.defaultQty &&
        product.type !== 'service' &&
        product.type !== 'ppob';
    const existing = canMerge ? POS.cart.find(item => item.id === product.id) : null;

    if (existing) {
        existing.quantity += quantity;
    } else {
        const initialQuantity = product.quantity ?? product.qty ?? quantity;

        POS.cart.push({
            ...product,
            quantity: initialQuantity,
            discount: product.discount || 0,
            altDesc: product.altDesc || '',
            cartId: product.cartId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`)
        });
    }

    renderAll();
    return true;
}

export function removeFromCart(productId) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci');
        return false;
    }

    POS.cart = POS.cart.filter(item => item.id !== productId);
    renderAll();
    return true;
}

export function updateQuantity(productId, newQuantity) {
    if (POS.transactionLocked) return false;

    const item = POS.cart.find(item => item.id === productId);
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
        }
        renderAll();
        return true;
    }
    return false;
}

export function updatePrice(productId, newPrice) {
    if (POS.transactionLocked) return false;

    const item = POS.cart.find(item => item.id === productId);
    if (item && newPrice > 0) {
        item.price = newPrice;
        renderAll();
        return true;
    }
    return false;
}

export function updateItemDiscount(productId, discountAmount) {
    if (POS.transactionLocked) return false;

    const item = POS.cart.find(item => item.id === productId);
    if (item) {
        item.discount = Math.min(discountAmount, item.price * item.quantity);
        renderAll();
        return true;
    }
    return false;
}

export function clearCart() {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci');
        return false;
    }

    POS.cart = [];
    POS.currentDiscount = 0;
    if (DOM.discountInput) DOM.discountInput.value = 0;
    renderAll();
    return true;
}

export function voidLastItem() {
    if (POS.cart.length > 0) {
        const lastItem = POS.cart[POS.cart.length - 1];
        removeFromCart(lastItem.id);
        showSuccess(`Item ${lastItem.name} telah di-void`);
    }
}

function renderAll() {
    renderCart();
    renderMobileCart();
    updateCartCount();
    POS.saveToStorage();
}

function updateCartCount() {
    const totalItems = POS.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (DOM.cartItemCount) DOM.cartItemCount.textContent = totalItems;
    if (DOM.mobileCartCount) DOM.mobileCartCount.textContent = totalItems;
}
