// Cart/CartManager
import {
    POS
} from '../core/state.js';
import {
    renderCart,
    renderMobileCart,
    updateCartSummary
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

/**
 * Helper logic: get price based on quantity and tiered pricing
 * Fallback to originalPrice/salePrice if no tier matches.
 */
function getPriceByQty(product, quantity) {
    const normalPrice = Number(product.originalPrice || product.salePrice || product.price || 0);

    if (!product.priceTiers || product.priceTiers.length === 0) {
        return normalPrice;
    }

    // Sort tiers descending based on minQty
    const sortedTiers = [...product.priceTiers].sort((a, b) => b.minQty - a.minQty);
    
    // Find first tier where current quantity >= minQty
    const tier = sortedTiers.find(t => Number(quantity) >= Number(t.minQty));
    
    return tier ? Number(tier.price) : normalPrice;
}

export function addToCart(product, quantity = 1) {
    if (POS.transactionLocked) {
        showWarning('Transaksi sedang dikunci, tidak bisa menambah item');
        return false;
    }

    const canMerge = !product.priceChangeAllowed &&
        product.type !== 'service' &&
        product.type !== 'ppob';
    
    const existing = canMerge ? POS.cart.find(item => item.id === product.id) : null;

    if (existing) {
        existing.quantity += Number(quantity);
        // Update price based on new total quantity
        if (!existing.priceChangeAllowed) {
            existing.price = getPriceByQty(existing, existing.quantity);
        }
    } else {
        const initialQuantity = Number(product.quantity ?? product.qty ?? quantity);
        // Always calculate price based on tiers, even for initial add
        const initialPrice = product.priceChangeAllowed ? (product.price || product.salePrice) : getPriceByQty(product, initialQuantity);

        POS.cart.push({
            ...product,
            price: initialPrice,
            quantity: initialQuantity,
            discount: product.discount || 0,
            altDesc: product.altDesc || '',
            cartId: product.cartId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`)
        });
    }

    clearAppliedPromo();
    renderAll();
    saveCart();
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
    saveCart();
    return true;
}

export function updateQuantity(productId, newQuantity) {
    if (POS.transactionLocked) return false;

    const item = POS.cart.find(item => item.id === productId);
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = Number(newQuantity);
            // Re-calculate price based on new quantity if tiers are available
            if (!item.priceChangeAllowed) {
                item.price = getPriceByQty(item, item.quantity);
            }
            clearAppliedPromo();
        }
        renderAll();
        saveCart();
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
        saveCart();
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
        saveCart();
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
    saveCart();
    return true;
}

export function voidLastItem() {
    if (POS.cart.length > 0) {
        const lastItem = POS.cart[POS.cart.length - 1];
        removeFromCart(lastItem.id);
        showSuccess(`Item ${lastItem.name} telah di-void`);
    }
}

export function saveCart() {
    POS.saveToStorage();
}

export function renderAll() {
    renderCart();
    renderMobileCart();
    updateCartSummary();
}

/**
 * Load cart from storage and initial render
 */
export function loadCart() {
    // POS already loads from localStorage in state.js
    renderAll();
}
