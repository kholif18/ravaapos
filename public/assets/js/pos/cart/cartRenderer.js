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

    if (POS.cart.length === 0) {
        DOM.cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="bx bx-cart"></i>
                <p>Keranjang kosong</p>
                <small>Scan barcode atau cari produk untuk memulai</small>
            </div>
        `;
    } else {
        DOM.cartItems.innerHTML = POS.cart.map((item, index) => createCartItemRow(item, index)).join('');
        bindCartItemEvents();
    }

    calculateAndDisplayTotals();
}

function createCartItemRow(item, index) {
    const itemTotal = (item.price * item.quantity) - (item.discount || 0);

    return `
        <div class="cart-item" data-id="${item.id}" data-index="${index}">
            <div class="cart-row">
                <div class="cart-col product">
                    <div class="cart-product-name">
                        ${escapeHtml(item.name)}
                        ${item.discount ? '<span class="badge bg-warning">Disc</span>' : ''}
                    </div>
                    <div class="cart-product-barcode">${escapeHtml(item.barcode || '')}</div>
                </div>
                <div class="cart-col price">
                    <input type="text" class="price-input" value="${formatRupiah(item.price)}" data-id="${item.id}" data-field="price">
                </div>
                <div class="cart-col qty">
                    <div class="cart-item-qty">
                        <input type="number" class="qty-input" value="${item.quantity}" data-id="${item.id}" data-field="qty" min="1">
                    </div>
                </div>
                <div class="cart-col disc">
                    <input type="text" class="disc-input" value="${formatRupiah(item.discount || 0)}" data-id="${item.id}" data-field="disc" placeholder="Diskon">
                </div>
                <div class="cart-col total">
                    ${formatRupiah(itemTotal)}
                </div>
                <div class="cart-col action">
                    <button class="btn-remove" data-id="${item.id}" title="Hapus item">
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
}

function handleQtyClick(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const delta = parseInt(e.currentTarget.dataset.delta);
    const item = POS.cart.find(i => i.id === id);
    if (item) {
        updateQuantity(id, item.quantity + delta);
    }
}

function handleRemoveClick(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    removeFromCart(id);
}

function handlePriceChange(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const rawValue = e.currentTarget.value;
    const price = parseInt(rawValue.replace(/[^0-9]/g, ''));
    if (price > 0) {
        updatePrice(id, price);
    } else {
        renderCart(); // Revert on invalid
    }
}

function handleQtyInputChange(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const qty = parseInt(e.currentTarget.value);
    if (qty > 0) {
        updateQuantity(id, qty);
    } else {
        renderCart();
    }
}

function handleDiscChange(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const rawValue = e.currentTarget.value;
    const discount = parseInt(rawValue.replace(/[^0-9]/g, ''));
    updateItemDiscount(id, discount);
}

function calculateAndDisplayTotals() {
    const subtotal = POS.getSubtotal();
    const afterDiscount = POS.getAfterDiscount();
    const tax = POS.getTax();
    const total = POS.getTotal();

    if (DOM.subtotal) DOM.subtotal.textContent = formatRupiah(subtotal);
    if (DOM.taxAmount) DOM.taxAmount.textContent = formatRupiah(tax);
    if (DOM.total) DOM.total.textContent = formatRupiah(total);
}

export function renderMobileCart() {
    if (!DOM.mobileCartItems) return;

    if (POS.cart.length === 0) {
        DOM.mobileCartItems.innerHTML = '<div class="text-center p-3">Keranjang kosong</div>';
    } else {
        DOM.mobileCartItems.innerHTML = POS.cart.map(item => `
            <div class="mobile-cart-item">
                <div class="mobile-cart-item-info">
                    <div class="mobile-cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="mobile-cart-item-price">${formatRupiah(item.price)}</div>
                </div>
                <div class="mobile-cart-item-actions">
                    <div class="mobile-cart-item-qty">
                        <button class="btn-qty-mobile" data-id="${item.id}" data-delta="-1">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="btn-qty-mobile" data-id="${item.id}" data-delta="1">+</button>
                    </div>
                    <div class="mobile-cart-item-total">${formatRupiah(item.price * item.quantity)}</div>
                    <button class="btn-remove-mobile" data-id="${item.id}">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        bindMobileCartEvents();
    }

    if (DOM.mobileTotal) DOM.mobileTotal.textContent = formatRupiah(POS.getTotal());
}

function bindMobileCartEvents() {
    document.querySelectorAll('.btn-qty-mobile').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.dataset.id);
            const delta = parseInt(btn.dataset.delta);
            const item = POS.cart.find(i => i.id === id);
            if (item) updateQuantity(id, item.quantity + delta);
        };
    });

    document.querySelectorAll('.btn-remove-mobile').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.dataset.id);
            removeFromCart(id);
        };
    });
}