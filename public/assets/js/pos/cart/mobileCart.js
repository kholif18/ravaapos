// Cart/MobileCart - Render dan event handling untuk mobile
import {
    DOM
} from '../core/dom.js';
import {
    POS
} from '../core/state.js';
import {
    updateQuantity,
    removeFromCart
} from './cartManager.js';
import {
    formatRupiah
} from '../utils/currency.js';
import {
    escapeHtml
} from '../utils/escapeHtml.js';
import {
    showWarning
} from '../ui/notifications.js';

let isMobileCartOpen = false;

export function initMobileCart() {
    bindMobileEvents();
    renderMobileCartView();
}

export function renderMobileCartView() {
    if (!DOM.mobileCartItems) return;

    if (POS.cart.length === 0) {
        DOM.mobileCartItems.innerHTML = `
            <div class="mobile-cart-empty">
                <i class="bx bx-cart"></i>
                <p>Keranjang kosong</p>
                <small>Scan barcode atau cari produk</small>
            </div>
        `;
        updateMobileBadge();
        return;
    }

    DOM.mobileCartItems.innerHTML = POS.cart.map(item => `
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
                    <button class="btn-qty-mobile" data-cart-id="${item.cartId}" data-delta="-1">
                        <i class="bx bx-minus"></i>
                    </button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="btn-qty-mobile" data-cart-id="${item.cartId}" data-delta="1">
                        <i class="bx bx-plus"></i>
                    </button>
                </div>
                <div class="mobile-cart-item-total">
                    ${formatRupiah((item.price * item.quantity) - (item.discount || 0))}
                </div>
                <button class="btn-remove-mobile" data-cart-id="${item.cartId}">
                    <i class="bx bx-trash"></i>
                </button>
            </div>
            ${item.discount ? `
                <div class="mobile-cart-item-discount">
                    <i class="bx bx-purchase-tag"></i> Diskon item: ${formatRupiah(item.discount)}
                </div>
            ` : ''}
        </div>
    `).join('');

    bindMobileCartEvents();
    updateMobileBadge();
}

function bindMobileCartEvents() {
    // Quantity buttons
    document.querySelectorAll('.btn-qty-mobile').forEach(btn => {
        btn.removeEventListener('click', handleMobileQtyClick);
        btn.addEventListener('click', handleMobileQtyClick);
    });

    // Remove buttons
    document.querySelectorAll('.btn-remove-mobile').forEach(btn => {
        btn.removeEventListener('click', handleMobileRemoveClick);
        btn.addEventListener('click', handleMobileRemoveClick);
    });

    // Swipe to delete (if supported)
    if ('ontouchstart' in window) {
        initSwipeToDelete();
    }
}

function handleMobileQtyClick(e) {
    e.stopPropagation();
    const id = parseInt(e.currentTarget.dataset.id);
    const delta = parseInt(e.currentTarget.dataset.delta);
    const item = POS.cart.find(i => i.id === id);

    if (item) {
        const newQty = item.quantity + delta;
        if (newQty >= 1) {
            updateQuantity(id, newQty);
        } else if (newQty === 0) {
            removeFromCart(id);
        }
    }
}

function handleMobileRemoveClick(e) {
    e.stopPropagation();
    const id = parseInt(e.currentTarget.dataset.id);
    removeFromCart(id);
}

function initSwipeToDelete() {
    const items = document.querySelectorAll('.mobile-cart-item');
    let touchStartX = 0;
    let touchEndX = 0;

    items.forEach(item => {
        item.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        item.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;

            if (swipeDistance < -50) { // Swipe left
                const id = parseInt(item.dataset.id);
                if (id) {
                    item.style.transform = 'translateX(-60px)';
                    setTimeout(() => {
                        removeFromCart(id);
                    }, 200);
                }
            } else {
                item.style.transform = '';
            }
        });
    });
}

function updateMobileBadge() {
    const totalItems = POS.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (DOM.mobileCartCount) {
        DOM.mobileCartCount.textContent = totalItems;
        DOM.mobileCartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function bindMobileEvents() {
    // Toggle mobile cart view
    const mobileCartBtn = document.getElementById('mobileCartBtn');
    if (mobileCartBtn) {
        mobileCartBtn.addEventListener('click', () => {
            toggleMobileCart();
        });
    }

    // Update total when cart changes
    document.addEventListener('cartUpdated', () => {
        renderMobileCartView();
        updateMobileTotal();
    });
}

function toggleMobileCart() {
    const cartContainer = document.querySelector('.mobile-cart-list');
    if (cartContainer) {
        isMobileCartOpen = !isMobileCartOpen;
        cartContainer.classList.toggle('expanded', isMobileCartOpen);
    }
}

function updateMobileTotal() {
    if (DOM.mobileTotal) {
        DOM.mobileTotal.textContent = formatRupiah(POS.getTotal());
    }
}

// Export untuk digunakan di file lain
export function scrollToMobileCart() {
    const cartContainer = document.querySelector('.mobile-cart-list');
    if (cartContainer) {
        cartContainer.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

export function isMobile() {
    return window.innerWidth < 768;
}