// Cart/CartRenderer
import {
    POS
} from '../core/state.js';
import {
    DOM
} from '../core/dom.js';
import {
    formatRupiah
} from '../utils/currency.js';
import {
    escapeHtml
} from '../utils/escapeHtml.js';
import {
    updateQuantity,
    updatePrice,
    updateItemDiscount,
    removeFromCart
} from './cartManager.js';

export function renderCart() {
    if (!DOM.cartItems) return;

    let html = `
        <div class="cart-header">
            <div class="cart-header-product">Produk</div>
            <div class="cart-header-price">Harga</div>
            <div class="cart-header-qty">Qty</div>
            <div class="cart-header-disc">Disc</div>
            <div class="cart-header-total">Total</div>
            <div class="cart-header-action"></div>
        </div>
    `;

    if (POS.cart.length === 0) {
        html += `
            <div class="cart-empty">
                <i class="bx bx-cart"></i>
                <p>Keranjang kosong</p>
                <small>Scan barcode atau cari produk untuk memulai</small>
            </div>
        `;
    } else {
        html += POS.cart.map((item, index) => createCartItemRow(item, index)).join('');
    }

    DOM.cartItems.innerHTML = html;

    if (POS.cart.length > 0) {
        bindCartItemEvents();
    }

    updateCartSummary();
}

function createCartItemRow(item, index) {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    const itemTotal = Math.max(0, (price * quantity) - discount);
    const isService = item.type === 'service';
    const isPPOB = item.type === 'ppob';
    const hasStockLimit = !isService && !isPPOB;
    const isPriceEditable = (item.priceChangeAllowed === true || item.priceChangeAllowed === 1) && !isPPOB;
    const stock = Number(item.stock) || 0;

    let badgeHtml = '';
    if (isService) badgeHtml += '<span class="badge bg-warning">SVC</span>';
    if (isPPOB) badgeHtml += '<span class="badge bg-info">PPOB</span>';

    return `
        <div class="cart-item" data-cart-id="${item.cartId}" data-index="${index}">
            <div class="cart-row">
                <div class="cart-col product">
                    <div class="cart-product-name" title="${escapeHtml(item.name)}">
                        ${escapeHtml(truncateText(item.name, 30))}
                        ${badgeHtml}
                        ${item.discount ? '<span class="badge bg-warning">Disc</span>' : ''}
                    </div>
                    ${item.enableAltDesc ? `
                        <input type="text"
                            class="form-control form-control-sm cart-desc-input"
                            data-cart-id="${item.cartId}"
                            data-field="altDesc"
                            placeholder="Deskripsi item..."
                            value="${escapeHtml(item.altDesc || '')}"
                            autocomplete="off">
                    ` : ''}
                </div>
                <div class="cart-col price">
                    <input type="number" class="form-control form-control-sm price-input ${isPriceEditable ? 'price-editable' : ''}" 
                        value="${price}" 
                        data-cart-id="${item.cartId}" 
                        data-field="price"
                        step="1000"
                        min="0"
                        ${!isPriceEditable ? 'readonly' : ''}>
                </div>
                <div class="cart-col qty">
                    <input type="number"
                        class="form-control form-control-sm qty-input"
                        value="${quantity}"
                        data-cart-id="${item.cartId}"
                        data-field="qty"
                        min="1"
                        step="1"
                        ${hasStockLimit ? `max="${stock}"` : ''}>
                </div>
                <div class="cart-col disc">
                    <input type="number"
                        class="form-control form-control-sm disc-input"
                        value="${discount}"
                        data-cart-id="${item.cartId}"
                        data-field="disc"
                        step="1000"
                        min="0">
                </div>
                <div class="cart-col total">
                    ${formatRupiah(itemTotal)}
                </div>
                <div class="cart-col action">
                    <button class="btn-remove" data-cart-id="${item.cartId}" title="Hapus item">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function bindCartItemEvents() {
    // Quantity buttons
    document.querySelectorAll('.btn-qty').forEach(btn => {
        btn.removeEventListener('click', handleQtyClick);
        btn.addEventListener('click', handleQtyClick);
    });

    // Remove buttons
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.removeEventListener('click', handleRemoveClick);
        btn.addEventListener('click', handleRemoveClick);
    });

    // Price inputs
    document.querySelectorAll('.price-input').forEach(input => {
        input.removeEventListener('change', handlePriceChange);
        input.addEventListener('change', handlePriceChange);
    });

    // Quantity inputs
    document.querySelectorAll('.qty-input').forEach(input => {
        input.removeEventListener('change', handleQtyInputChange);
        input.addEventListener('change', handleQtyInputChange);
    });

    // Discount inputs
    document.querySelectorAll('.disc-input').forEach(input => {
        input.removeEventListener('change', handleDiscChange);
        input.addEventListener('change', handleDiscChange);
    });

    // Alt Desc inputs
    document.querySelectorAll('.cart-desc-input').forEach(input => {
        input.removeEventListener('change', handleAltDescChange);
        input.addEventListener('change', handleAltDescChange);
    });
}

function handleQtyClick(e) {
    e.preventDefault();

    const cartId = e.currentTarget.dataset.cartId;
    const delta = parseInt(e.currentTarget.dataset.delta, 10) || 0;

    const item = POS.cart.find(i => i.cartId === cartId);

    if (item) {
        updateQuantity(cartId, item.quantity + delta);
    }
}

function handleRemoveClick(e) {
    e.preventDefault();

    const cartId = e.currentTarget.dataset.cartId;

    if (cartId) {
        removeFromCart(cartId);
    }
}

function handlePriceChange(e) {
    const input = e.currentTarget;
    const cartId = input.dataset.cartId;
    const price = parseFloat(input.value) || 0;

    if (cartId && price > 0) {
        updatePrice(cartId, price);
    }
}

function handleQtyInputChange(e) {
    const input = e.currentTarget;
    const cartId = input.dataset.cartId;
    const quantity = parseFloat(input.value) || 0;

    if (cartId) {
        updateQuantity(cartId, quantity);
    }
}

function handleDiscChange(e) {
    const input = e.currentTarget;
    const cartId = input.dataset.cartId;
    const discount = parseFloat(input.value) || 0;

    if (cartId) {
        updateItemDiscount(cartId, discount);
    }
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
}

function handleAltDescChange(e) {
    const cartId = e.currentTarget.dataset.cartId;
    const value = e.currentTarget.value;
    const item = POS.cart.find(i => i.cartId === cartId);
    if (item) {
        item.altDesc = value;
        POS.saveToStorage();
    }
}

function calculateAndDisplayTotals() {
    const totals = POS.calculateTotals();

    if (DOM.subtotal) DOM.subtotal.textContent = formatRupiah(totals.subtotal);
    if (DOM.taxAmount) DOM.taxAmount.textContent = formatRupiah(totals.taxAmount);
    if (DOM.total) DOM.total.textContent = formatRupiah(totals.total);
    if (DOM.mobileTotal) DOM.mobileTotal.textContent = formatRupiah(totals.total);
}

export function renderMobileCart() {
    if (!DOM.mobileCartItems) return;

    if (POS.cart.length === 0) {
        DOM.mobileCartItems.innerHTML = '<div class="text-center p-3">Keranjang kosong</div>';
    } else {
        DOM.mobileCartItems.innerHTML = POS.cart.map(item => {
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const discount = Number(item.discount) || 0;
            const itemTotal = Math.max(0, (price * quantity) - discount);

            return `
                <div class="mobile-cart-item" data-cart-id="${item.cartId}">
                    <div class="mobile-cart-item-info">
                        <div class="mobile-cart-item-name">
                            ${escapeHtml(item.name)}
                            ${item.discount ? '<span class="badge bg-warning">Disc</span>' : ''}
                        </div>
                        <div class="mobile-cart-item-price">${formatRupiah(item.price)}</div>
                    </div>
                    <div class="mobile-cart-item-actions">
                        <div class="mobile-cart-item-qty">
                            <button class="btn-qty btn-qty-minus-mobile" data-cart-id="${item.cartId}" data-delta="-1">-</button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="btn-qty btn-qty-plus-mobile" data-cart-id="${item.cartId}" data-delta="1">+</button>
                        </div>
                        <div class="mobile-cart-item-total">${formatRupiah(itemTotal)}</div>
                        <button class="btn-remove btn-remove-mobile" data-cart-id="${item.cartId}">
                            <i class="bx bx-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        bindMobileCartEvents();
    }

    updateCartSummary();
}

function bindMobileCartEvents() {
    document.querySelectorAll('.btn-qty-minus-mobile, .btn-qty-plus-mobile').forEach(btn => {
        btn.addEventListener('click', handleQtyClick);
    });

    document.querySelectorAll('.btn-remove-mobile').forEach(btn => {
        btn.addEventListener('click', handleRemoveClick);
    });
}

export function updateCartSummary() {
    const totalItems = POS.cart.length;
    const totalQuantity = POS.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // Update badge jumlah jenis produk
    const cartItemCountEl = document.getElementById('cartItemCount');
    if (cartItemCountEl) {
        cartItemCountEl.textContent = totalItems;
        cartItemCountEl.title = `${totalItems} jenis produk`;
    }

    // Update badge total unit
    const cartTotalQtyEl = document.getElementById('cartTotalQty');
    if (cartTotalQtyEl) {
        cartTotalQtyEl.textContent = totalQuantity;
        cartTotalQtyEl.title = `Total ${totalQuantity} unit`;
    }

    // Mobile badge
    if (DOM.mobileCartCount) {
        DOM.mobileCartCount.textContent = totalQuantity;
        DOM.mobileCartCount.style.display = totalQuantity > 0 ? 'inline-flex' : 'none';
    }

    // Also update totals (subtotal, tax, total)
    calculateAndDisplayTotals();
}