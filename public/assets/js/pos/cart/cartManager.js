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

function clearAppliedPromo() {
    if (!POS.appliedPromo) return;

    POS.appliedPromo = null;
    POS.currentDiscount = 0;
    if (DOM.discountInput) DOM.discountInput.value = 0;
    if (DOM.promoInput) DOM.promoInput.value = '';
}

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

    clearAppliedPromo();
    renderAll();
    POS.saveToStorage();
    return true;
}

export function removeFromCart(productId) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci');
        return false;
    }

    POS.cart = POS.cart.filter(item => item.id !== productId);
    clearAppliedPromo();
    renderAll();
    POS.saveToStorage();
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
            clearAppliedPromo();
        }
        renderAll();
        POS.saveToStorage();
        return true;
    }
    return false;
}

export function updatePrice(productId, newPrice) {
    if (POS.transactionLocked) return false;

    const item = POS.cart.find(item => item.id === productId);
    if (item && newPrice > 0) {
        item.price = newPrice;
        clearAppliedPromo();
        renderAll();
        POS.saveToStorage();
        return true;
    }
    return false;
}

export function updateItemDiscount(productId, discountAmount) {
    if (POS.transactionLocked) return false;

    const item = POS.cart.find(item => item.id === productId);
    if (item) {
        item.discount = Math.min(discountAmount, item.price * item.quantity);
        clearAppliedPromo();
        renderAll();
        POS.saveToStorage();
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
    POS.appliedPromo = null;
    if (DOM.discountInput) DOM.discountInput.value = 0;
    if (DOM.promoInput) DOM.promoInput.value = '';
    renderAll();
    POS.saveToStorage();
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
    // POS.saveToStorage();
}

function updateCartCount() {
    if (document.readyState !== 'complete') {
        setTimeout(updateCartCount, 100);
        return;
    }
    
    const totalItems = POS.cart.length;
    const totalQuantity = POS.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Update badge utama (jumlah item)
    const cartItemCountEl = document.getElementById('cartItemCount');
    if (cartItemCountEl) {
        cartItemCountEl.textContent = totalItems;
        cartItemCountEl.title = `${totalItems} jenis produk`;
    }

    // Update badge total qty
    const totalQtyEl = document.getElementById('cartTotalQty');
    if (totalQtyEl) {
        totalQtyEl.textContent = totalQuantity;
        totalQtyEl.title = `Total ${totalQuantity} unit`;
    }

    // Mobile badge (cukup total qty)
    if (DOM.mobileCartCount) {
        DOM.mobileCartCount.textContent = totalQuantity;
        DOM.mobileCartCount.style.display = totalQuantity > 0 ? 'inline-flex' : 'none';
    }
}
