/**
 * POS System - Main JavaScript (Fixed)
 * Fix: priceChangeAllowed products now work correctly
 * Shortcuts: F1=Search, F2=Customer, F3=Clear Cart, F4=Checkout, F8=Menu, F9=Cash
 */

// ==================== STATE MANAGEMENT ====================
const POS = {
    cart: [],
    selectedCustomer: null,
    isTransactionLocked: false,
    currentUser: { name: 'Admin' },
    csrfToken: null,
    taxRate: 11,
    nextCartId: 1, // Untuk generate unique ID
    
    // Search state
    currentSearchResults: [],
    selectedSearchIndex: -1,
    searchTimeout: null,
    
    // Customer search state
    currentCustomerResults: [],
    selectedCustomerIndex: -1,
    customerSearchTimeout: null,
    
    // Pending product for price confirmation
    pendingProduct: null
};

// ==================== DOM ELEMENTS ====================
const DOM = {
    cartItems: null,
    mobileCartItems: null,
    subtotal: null,
    taxAmount: null,
    total: null,
    mobileTotal: null,
    discountInput: null,
    searchProduct: null,
    mobileSearchProduct: null,
    clearCartBtn: null,
    completeOrderBtn: null,
    cashPaymentBtn: null,
    taxRateSpan: null,
    cartItemCount: null,
    mobileCartCount: null
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    initializeDOM();
    initializeEventListeners();
    initializeModals();
    initializeTimeUpdater();
    initializeMobileMenu();
    syncSlidePanelButtons();
    
    // Set CSRF token
    POS.csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    POS.taxRate = parseFloat(document.body.dataset.taxRate) || 11;
    
    // Restore draft if exists
    loadDraftTransaction();
    
    renderCart();

    // Focus ke search
    setTimeout(() => DOM.searchProduct?.focus(), 100);
});

function loadDraftTransaction() {
    const draft = localStorage.getItem('pos_draft_transaction');
    if (draft) {
        try {
            const data = JSON.parse(draft);
            if (data.cart && data.cart.length > 0) {
                if (confirm('Ada transaksi tersimpan. Load kembali?')) {
                    POS.cart = data.cart;
                    if (data.discount) DOM.discountInput.value = data.discount;
                    renderCart();
                    showNotification('Info', 'Draft loaded', 'info');
                }
                localStorage.removeItem('pos_draft_transaction');
            }
        } catch(e) {}
    }
}

function initializeDOM() {
    DOM.cartItems = document.getElementById('cartItems');
    DOM.mobileCartItems = document.getElementById('mobileCartItems');
    DOM.subtotal = document.getElementById('subtotal');
    DOM.taxAmount = document.getElementById('taxAmount');
    DOM.total = document.getElementById('total');
    DOM.mobileTotal = document.getElementById('mobileTotal');
    DOM.discountInput = document.getElementById('discountInput');
    DOM.searchProduct = document.getElementById('searchProduct');
    DOM.mobileSearchProduct = document.getElementById('mobileSearchProduct');
    DOM.clearCartBtn = document.getElementById('clearCartBtn');
    DOM.completeOrderBtn = document.getElementById('completeOrderBtn');
    DOM.cashPaymentBtn = document.getElementById('cashPaymentBtn');
    DOM.cartItemCount = document.querySelector('.cart-badge');
    DOM.mobileCartCount = document.getElementById('mobileCartCount');
}

function initializeTimeUpdater() {
    updateTime();
    setInterval(updateTime, 1000);
}

function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
}

// ==================== MODALS ====================
function initializeModals() {
    createPaymentModal();
    createSuccessModal();
}

function createPaymentModal() {
    if (document.getElementById('paymentModal')) return;
    
    const modalHtml = `
        <div class="modal fade" id="paymentModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body p-4">
                        <div class="total-amount-card text-center mb-3 p-3 bg-primary text-white rounded">
                            <small>TOTAL BAYAR</small>
                            <h2 class="total-amount-value" id="paymentTotalAmount">Rp 0</h2>
                        </div>
                        <div class="payment-methods d-flex gap-2 mb-3">
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="cash"><i class="bx bx-money"></i> Cash</button>
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="card"><i class="bx bx-credit-card"></i> Card</button>
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="qris"><i class="bx bx-qr"></i> QRIS</button>
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="transfer"><i class="bx bx-transfer"></i> Transfer</button>
                        </div>
                        <div class="cash-amount-group">
                            <label class="form-label">Jumlah Dibayar</label>
                            <div class="input-group mb-2">
                                <span class="input-group-text">Rp</span>
                                <input type="number" class="form-control" id="paymentAmount" min="0" step="1000">
                            </div>
                            <div class="quick-amounts d-flex gap-2 mb-3">
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="round">Bulatkan</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="exact">Pas</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="50000">+50k</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="100000">+100k</button>
                            </div>
                            <div class="change-info p-2 bg-light rounded">
                                <small>Kembalian</small>
                                <h4 id="paymentChange" class="mb-0">Rp 0</h4>
                            </div>
                        </div>
                        <textarea class="form-control mt-3" id="paymentNotes" rows="2" placeholder="Catatan (opsional)..."></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="confirmPaymentBtn" disabled>Bayar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function createSuccessModal() {
    if (document.getElementById('successModal')) return;
    
    const modalHtml = `
        <div class="modal fade" id="successModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center p-4">
                        <div class="success-icon mb-3">
                            <i class="bx bx-check-circle text-success" style="font-size: 64px;"></i>
                        </div>
                        <h4>PEMBAYARAN BERHASIL</h4>
                        <p class="text-muted" id="successOrderNumber">Order #0000</p>
                        <div id="successChangeCard" class="bg-light p-3 rounded mb-3" style="display: none;">
                            <small>KEMBALIAN</small>
                            <h3 id="successChangeAmount">Rp 0</h3>
                        </div>
                        <div class="payment-details bg-light p-3 rounded mb-3">
                            <div class="d-flex justify-content-between"><span>Total</span><span id="successTotal">Rp 0</span></div>
                            <div class="d-flex justify-content-between" id="successPaidRow" style="display: none;"><span>Dibayar</span><span id="successPaid">Rp 0</span></div>
                            <div class="d-flex justify-content-between"><span>Metode</span><span id="successMethod">Cash</span></div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-secondary flex-fill" id="printReceiptBtn"><i class="bx bx-printer"></i> Print</button>
                            <button class="btn btn-primary flex-fill" id="newTransactionBtn"><i class="bx bx-check-double"></i> Selesai</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==================== EVENT LISTENERS ====================
function initializeEventListeners() {
    // Search
    initializeSearch();
    initializeCustomerSearch();
    
    // Cart actions (delegation)
    document.addEventListener('click', handleDocumentClick);
    
    // Buttons
    DOM.clearCartBtn?.addEventListener('click', handleClearCart);
    DOM.completeOrderBtn?.addEventListener('click', handleCompleteOrder);
    DOM.cashPaymentBtn?.addEventListener('click', handleCashPayment);
    DOM.discountInput?.addEventListener('input', () => renderCart());
    
    // Action panel buttons
    initializeActionButtons();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Sync search between desktop and mobile
    if (DOM.searchProduct && DOM.mobileSearchProduct) {
        DOM.searchProduct.addEventListener('input', (e) => {
            DOM.mobileSearchProduct.value = e.target.value;
            performSearch(e.target.value.trim());
        });
        DOM.mobileSearchProduct.addEventListener('input', (e) => {
            DOM.searchProduct.value = e.target.value;
            performSearch(e.target.value.trim());
        });
    }
}

function handleDocumentClick(e) {
    const target = e.target;
    const btn = target.closest('button');
    if (!btn) return;

    // Tombol remove
    else if (btn.classList.contains('btn-remove')) {
        e.preventDefault();
        e.stopPropagation();
        if (POS.isTransactionLocked) return;
        const cartId = btn.dataset.cartId; // LANGSUNG
        removeFromCart(cartId);
    }
    // Tombol minus mobile
    else if (btn.classList.contains('btn-qty-minus-mobile')) {
        e.preventDefault();
        e.stopPropagation();
        if (POS.isTransactionLocked) return;
        const cartId = btn.dataset.cartId; // LANGSUNG
        updateQuantity(cartId, -1);
    }
    // Tombol plus mobile
    else if (btn.classList.contains('btn-qty-plus-mobile')) {
        e.preventDefault();
        e.stopPropagation();
        if (POS.isTransactionLocked) return;
        const cartId = btn.dataset.cartId; // LANGSUNG
        updateQuantity(cartId, 1);
    }
}

function initializeActionButtons() {
    const buttons = {
        lockTransactionBtn: lockTransaction,
        unlockTransactionBtn: unlockTransaction,
        voidTransactionBtn: voidTransaction,
        voidItemBtn: voidItem,
        saveTransactionBtn: saveTransaction,
        cardPaymentBtn: () => handleNonCashPayment('card'),
        qrisPaymentBtn: () => handleNonCashPayment('qris'),
        transferPaymentBtn: () => handleNonCashPayment('transfer'),
        refreshCartBtn: () => renderCart(),
        dailyReportBtn: () => showNotification('Info', 'Daily Report feature coming soon', 'info'),
        xReadingBtn: () => showNotification('Info', 'X-Reading feature coming soon', 'info'),
        zReadingBtn: () => showNotification('Info', 'Z-Reading feature coming soon', 'info'),
        printerSettingsBtn: () => showNotification('Info', 'Printer settings coming soon', 'info'),
        shiftSettingsBtn: () => showNotification('Info', 'Shift management coming soon', 'info'),
        logoutBtn: () => {
            if (confirm('Yakin ingin logout?')) {
                window.location.href = '/logout';
            }
        }
    };
    
    Object.entries(buttons).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
    });
}

// ==================== SEARCH & PRODUCT ====================
function initializeSearch() {
    const searchInput = DOM.searchProduct || DOM.mobileSearchProduct;
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim();
        clearTimeout(POS.searchTimeout);
        
        if (keyword.length < 2) {
            hideSearchDropdown();
            return;
        }
        
        POS.searchTimeout = setTimeout(() => performSearch(keyword), 300);
    });
    
    searchInput.addEventListener('keydown', handleSearchKeydown);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const keyword = searchInput.value.trim();
            if (/^\d+$/.test(keyword) && keyword.length >= 8) {
                e.preventDefault();
                handleBarcodeScan(keyword);
            }
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pos-search-group') && !e.target.closest('.mobile-search')) {
            hideSearchDropdown();
        }
    });
}

function handleSearchItemClick(e) {
    const item = e.currentTarget;
    const id = parseInt(item.dataset.id);
    const product = POS.currentSearchResults.find(p => p.id === id);
    if (product) {
        addProductToCart(product);
        clearSearchInput();
        hideSearchDropdown();
        setTimeout(() => {
            if (DOM.searchProduct) DOM.searchProduct.focus();
            if (DOM.mobileSearchProduct) DOM.mobileSearchProduct.focus();
        }, 100);
    }
}

function handleMobileSearchKeydown(e) {
    const dropdown = document.getElementById('mobileSearchDropdown');
    if (!dropdown || dropdown.style.display === 'none') return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextResult();
        setTimeout(() => {
            const selectedItem = document.querySelector('#mobileSearchResultsList .search-dropdown-item.selected');
            if (selectedItem) {
                selectedItem.scrollIntoView({
                    block: 'nearest'
                });
            }
        }, 50);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPreviousResult();
        setTimeout(() => {
            const selectedItem = document.querySelector('#mobileSearchResultsList .search-dropdown-item.selected');
            if (selectedItem) {
                selectedItem.scrollIntoView({
                    block: 'nearest'
                });
            }
        }, 50);
    } else if (e.key === 'Escape') {
        hideSearchDropdown();
    }
}

async function performSearch(keyword) {
    try {
        const response = await fetch(`/pos/search?q=${encodeURIComponent(keyword)}`);
        const data = await response.json();

        if (data.success && data.products) {
            POS.currentSearchResults = data.products.slice(0, 10);
            POS.selectedSearchIndex = -1;

            // Render untuk kedua dropdown
            renderSearchDropdown(POS.currentSearchResults, 'searchResultsList');
            renderSearchDropdown(POS.currentSearchResults, 'mobileSearchResultsList');

            showSearchDropdown();
        } else {
            hideSearchDropdown();
        }
    } catch (error) {
        console.error('Search error:', error);
        hideSearchDropdown();
    }
}

function renderSearchDropdown(products, containerId) {
    const listContainer = document.getElementById(containerId);
    if (!listContainer) return;

    if (!products || products.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-muted py-3"><small>Tidak ada produk ditemukan</small></div>';
        return;
    }

    let html = '';
    products.forEach((product, index) => {
        const isService = product.service === true;
        const isPPOB = product.type === 'ppob';
        const stockClass = product.stock <= 0 ? 'low-stock' : (product.stock < 10 ? 'medium-stock' : 'high-stock');

        html += `
            <div class="search-dropdown-item" data-index="${index}" data-id="${product.id}">
                <div class="search-dropdown-info">
                    <div class="search-dropdown-name">
                        <span class="item-name">${escapeHtml(product.name)}</span>
                        ${product.code ? `<span class="item-code">${escapeHtml(product.code)}</span>` : ''}
                        ${isPPOB ? '<span class="badge bg-info ms-1">PPOB</span>' : ''}
                        ${isService ? '<span class="badge bg-warning ms-1">SVC</span>' : ''}
                    </div>
                    <div class="search-dropdown-meta">
                        <span class="item-price">${formatRupiah(product.salePrice)}</span>
                        <span class="item-stock">
                            <i class="bx bx-package"></i>
                            Stok: <span class="stock-value ${stockClass}">${product.stock ?? '∞'}</span>
                        </span>
                    </div>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // Attach click events untuk setiap item di container ini
    document.querySelectorAll(`#${containerId} .search-dropdown-item`).forEach(item => {
        item.removeEventListener('click', handleSearchItemClick);
        item.addEventListener('click', handleSearchItemClick);
    });
}

function handleSearchKeydown(e) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown || dropdown.style.display === 'none') return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextResult();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPreviousResult();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (POS.selectedSearchIndex >= 0 && POS.currentSearchResults[POS.selectedSearchIndex]) {
            addProductToCart(POS.currentSearchResults[POS.selectedSearchIndex]);
            clearSearchInput();
            hideSearchDropdown();
        }
    } else if (e.key === 'Escape') {
        hideSearchDropdown();
    }
}

function clearSearchInput() {
    if (DOM.searchProduct) DOM.searchProduct.value = '';
    if (DOM.mobileSearchProduct) DOM.mobileSearchProduct.value = '';
}

function selectNextResult() {
    if (POS.currentSearchResults.length === 0) return;
    POS.selectedSearchIndex = (POS.selectedSearchIndex + 1) % POS.currentSearchResults.length;
    updateSelectedItem();
}

function selectPreviousResult() {
    if (POS.currentSearchResults.length === 0) return;
    POS.selectedSearchIndex = (POS.selectedSearchIndex - 1 + POS.currentSearchResults.length) % POS.currentSearchResults.length;
    updateSelectedItem();
}

function updateSelectedItem() {
    // Update desktop dropdown
    document.querySelectorAll('#searchResultsList .search-dropdown-item').forEach((item, i) => {
        if (i === POS.selectedSearchIndex) {
            item.classList.add('selected');
            item.scrollIntoView({
                block: 'nearest'
            });
        } else {
            item.classList.remove('selected');
        }
    });

    // Update mobile dropdown
    document.querySelectorAll('#mobileSearchResultsList .search-dropdown-item').forEach((item, i) => {
        if (i === POS.selectedSearchIndex) {
            item.classList.add('selected');
            item.scrollIntoView({
                block: 'nearest'
            });
        } else {
            item.classList.remove('selected');
        }
    });
}

function showSearchDropdown() {
    const desktopDropdown = document.getElementById('searchDropdown');
    const mobileDropdown = document.getElementById('mobileSearchDropdown');

    // Tentukan posisi dropdown berdasarkan viewport
    const isMobile = window.innerWidth <= 768;

    if (isMobile && mobileDropdown) {
        mobileDropdown.style.display = 'flex';
        // Scroll ke dropdown
        setTimeout(() => {
            mobileDropdown.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 50);
    } else if (desktopDropdown) {
        desktopDropdown.style.display = 'block';
    }
}

function hideSearchDropdown() {
    const desktopDropdown = document.getElementById('searchDropdown');
    const mobileDropdown = document.getElementById('mobileSearchDropdown');
    const backdrop = document.getElementById('searchDropdownBackdrop');

    if (desktopDropdown) desktopDropdown.style.display = 'none';
    if (mobileDropdown) mobileDropdown.style.display = 'none';
    if (backdrop) backdrop.classList.remove('show');

    POS.currentSearchResults = [];
    POS.selectedSearchIndex = -1;
}

async function handleBarcodeScan(barcode) {
    try {
        const response = await fetch(`/pos/product/${encodeURIComponent(barcode)}`);
        const data = await response.json();
        
        if (data.success && data.product) {
            addProductToCart(data.product);
            clearSearchInput();
            hideSearchDropdown();
        } else {
            showError('Not Found', 'Produk tidak ditemukan');
        }
    } catch (error) {
        console.error('Barcode error:', error);
        showError('Error', 'Gagal memindai barcode');
    }
}

function addProductToCart(product) {
    const isService = product.type === 'service';
    const isPPOB = product.type === 'ppob';

    const cartProduct = {
        id: product.id,
        name: product.name,
        price: product.salePrice,
        originalPrice: product.salePrice,
        stock: product.stock || 999999,
        code: product.code || '',
        tax: product.tax || 0,
        enableTax: product.enableInputTax || false,
        enableAltDesc: product.enableAltDesc || false,
        priceChangeAllowed: product.priceChangeAllowed || false,
        requireQtyInput: product.requireQtyInput || false,
        type: product.type || 'fisik',
        isService: isService,
        isPPOB: isPPOB,
        altDesc: ''
    };

    // LANGSUNG TAMBAH KE CART, tanpa modal apapun
    addToCart(cartProduct);
    clearSearchInput();
    hideSearchDropdown();

    // Setelah cart render, auto-focus ke field yang sesuai
    setTimeout(() => {
        autoFocusNewItem(cartProduct);
    }, 100);
}

// Auto focus ke field yang perlu diedit
function autoFocusNewItem(product) {
    const cartItems = document.querySelectorAll('.cart-item');
    if (cartItems.length === 0) return;

    // Ambil item terakhir yang ditambahkan
    const lastItem = cartItems[cartItems.length - 1];
    const cartId = lastItem.dataset.cartId;
    const item = findCartItem(cartId);

    if (!item) return;

    // Prioritas focus: Qty > Price
    if (item.defaultQty || item.isService || item.isPPOB) {
        // Jika defaultQty true atau service/PPOB, fokus ke qty
        const qtyInput = lastItem.querySelector('.qty-input');
        if (qtyInput && !qtyInput.disabled) {
            qtyInput.focus();
            qtyInput.select();
            activeField = 'qty';
            highlightActiveRow(lastItem);
            return;
        }
    }

    if (item.priceChangeAllowed) {
        // Jika price editable, fokus ke price
        const priceInput = lastItem.querySelector('.price-input.price-editable');
        if (priceInput && !priceInput.disabled) {
            priceInput.focus();
            priceInput.select();
            activeField = 'price';
            highlightActiveRow(lastItem);
            return;
        }
    }

    // Default: fokus ke qty
    const qtyInput = lastItem.querySelector('.qty-input');
    if (qtyInput && !qtyInput.disabled) {
        qtyInput.focus();
        qtyInput.select();
        activeField = 'qty';
        highlightActiveRow(lastItem);
    }
}

function confirmAddToCart(e) {
    e.preventDefault();

    if (!POS.pendingProduct) {
        console.error('No pending product');
        // Tutup modal jika tidak ada pending product
        const modalElement = document.getElementById('priceConfirmModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        // Fokus ke search
        setTimeout(() => DOM.searchProduct?.focus(), 100);
        return;
    }

    const priceInput = document.getElementById('confirmProductPrice');
    const newPrice = parseFloat(priceInput?.value);

    if (isNaN(newPrice) || newPrice <= 0) {
        showError('Harga Tidak Valid', 'Masukkan harga yang valid');
        // Tetap fokus ke input harga, jangan tutup modal
        setTimeout(() => priceInput?.focus(), 100);
        return;
    }

    // Clone product dengan harga baru
    const productToAdd = {
        ...POS.pendingProduct,
        price: newPrice,
        originalPrice: newPrice
    };

    // Hapus pending product
    POS.pendingProduct = null;

    // Tutup modal
    const modalElement = document.getElementById('priceConfirmModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();

    // Tambahkan ke cart
    addToCart(productToAdd);
    
    // Bersihkan search
    clearSearchInput();
    hideSearchDropdown();
    
    // Fokus kembali ke search product (F1)
    setTimeout(() => {
        if (DOM.searchProduct) {
            DOM.searchProduct.focus();
            DOM.searchProduct.select();
        }
    }, 150);
}

// ==================== CART MANAGEMENT ====================
function addToCart(product) {
    const canMerge = !product.priceChangeAllowed && !product.defaultQty;
    const existing = canMerge ? POS.cart.find(item => item.id === product.id && !item.priceChangeAllowed && !item.defaultQty) : null;
    const noStockLimit = product.isService || product.isPPOB;

    if (existing) {
        if (!noStockLimit && existing.qty >= existing.stock) {
            showError('Stock Habis', `Stok ${product.name} tidak mencukupi`);
            return false;
        }
        existing.qty++;
    } else {
        const newItem = {
            ...product,
            cartId: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random(),
            qty: product.defaultQty ? 0 : 1, // Jika defaultQty true, qty = 0 (perlu input)
            noStockLimit: noStockLimit,
            altDesc: product.altDesc || ''
        };
        POS.cart.push(newItem);
    }

    renderCart();
    return true;
}

function updateQuantity(cartId, delta) {
    if (POS.isTransactionLocked) {
        showError('Transaksi Terkunci', 'Unlock terlebih dahulu');
        return;
    }

    const item = findCartItem(cartId);
    if (!item) {
        console.error('Item not found:', cartId);
        return;
    }

    const newQty = item.qty + delta;
    const noStockLimit = item.noStockLimit || item.isService || item.isPPOB;

    if (newQty <= 0) {
        removeFromCart(cartId);
    } else if (noStockLimit || newQty <= item.stock) {
        item.qty = newQty;
        renderCart();
    } else {
        showError('Stock Habis', `Stok ${item.name} hanya ${item.stock}`);
    }
}

function removeFromCart(cartId) {
    if (POS.isTransactionLocked) {
        showError('Transaksi Terkunci', 'Unlock terlebih dahulu');
        return;
    }
    POS.cart = POS.cart.filter(item => item.cartId != cartId);
    renderCart();
}

function voidItem() {
    if (POS.isTransactionLocked) {
        showError('Transaksi Terkunci', 'Unlock terlebih dahulu');
        return;
    }
    
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Tidak ada item yang dapat di-void');
        return;
    }
    
    const lastItem = POS.cart[POS.cart.length - 1];
    if (confirm(`Hapus item "${lastItem.name}" dari cart?`)) {
        POS.cart.pop();
        renderCart();
        showNotification('Success', 'Item telah dihapus', 'success');
    }
}

function handleClearCart() {
    if (POS.isTransactionLocked) {
        showError('Transaksi Terkunci', 'Unlock terlebih dahulu');
        return;
    }
    
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Tidak ada item dalam cart');
        return;
    }
    
    if (confirm('Yakin ingin mengosongkan seluruh cart?')) {
        POS.cart = [];
        renderCart();
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

// fungsi ini untuk format input rupiah
function formatRupiahInput(angka) {
    if (!angka && angka !== 0) return '0';
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// fungsi untuk parse rupiah dari input
function parseRupiahInput(value) {
    if (!value) return 0;
    return parseInt(value.toString().replace(/\./g, '')) || 0;
}

// Helper function to find cart item by cartId
function findCartItem(cartId) {
    return POS.cart.find(item => item.cartId == cartId);
}

// Helper truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

// ========================================
// CART UPDATE FUNCTIONS (PERTAHANKAN)
// ========================================

function updateCartItemPrice(cartId, newPrice) {
    const item = findCartItem(cartId);
    if (item && item.priceChangeAllowed && item.price !== newPrice) {
        item.price = newPrice;
        renderCart(); // Re-render to update totals
        showNotification('Berhasil', `Harga ${item.name} berhasil diubah menjadi ${formatRupiah(newPrice)}`, 'success');
    }
}

function updateCartItemQty(cartId, newQty) {
    const item = findCartItem(cartId);
    if (item && item.qty !== newQty) {
        const noStockLimit = item.noStockLimit || item.isService || item.isPPOB;
        
        // Validate stock
        if (!noStockLimit && newQty > item.stock) {
            showError('Stok Habis', `Stok ${item.name} hanya ${item.stock}`);
            return false;
        }
        
        item.qty = newQty;
        renderCart();
        return true;
    }
    return false;
}

function updateCartItemDiscount(cartId, newDiscount) {
    const item = findCartItem(cartId);
    if (item && item.discount !== newDiscount) {
        item.discount = newDiscount;
        renderCart();
    }
}

function updateCartItemDesc(cartId, newDesc) {
    const item = findCartItem(cartId);
    if (item && item.altDesc !== newDesc) {
        item.altDesc = newDesc;
        // Don't re-render for description to keep focus, just update totals
        calculateAndDisplayTotals();
    }
}

// ========================================
// EVENT HANDLERS
// ========================================

function handlePriceChange(e) {
    if (POS.isTransactionLocked) return;

    const input = e.target;
    if (input.readOnly || input.disabled) return;

    const cartId = input.dataset.cartId;
    let newPrice = parseFloat(input.value);
    const item = findCartItem(cartId);

    if (!item) return;

    if (isNaN(newPrice) || newPrice < 0) {
        newPrice = 0;
        input.value = 0;
    }

    if (item.price !== newPrice) {
        item.price = newPrice;
        renderCart();

        // Focus kembali ke field berikutnya (discount)
        setTimeout(() => {
            const discInput = document.querySelector(`.cart-item[data-cart-id="${cartId}"] .disc-input`);
            if (discInput) {
                discInput.focus();
                discInput.select();
                activeField = 'disc';
            }
        }, 50);
    }
}

function handleQtyChange(e) {
    if (POS.isTransactionLocked) return;

    const cartId = e.target.dataset.cartId;
    let newQty = parseInt(e.target.value);
    const item = findCartItem(cartId);

    if (!item) return;

    const noStockLimit = item.noStockLimit || item.isService || item.isPPOB;

    // Jika qty 0, hapus item dari cart
    if (newQty === 0) {
        removeFromCart(cartId);
        return;
    }

    if (isNaN(newQty) || newQty < 1) newQty = 1;

    if (!noStockLimit && newQty > item.stock) {
        showError('Stok Habis', `Stok ${item.name} hanya ${item.stock}`);
        e.target.value = item.qty;
        return;
    }

    if (item.qty !== newQty) {
        item.qty = newQty;
        renderCart();

        // Setelah render, focus ke price jika perlu
        setTimeout(() => {
            if (item.priceChangeAllowed) {
                const priceInput = document.querySelector(`.cart-item[data-cart-id="${cartId}"] .price-input.price-editable`);
                if (priceInput) {
                    priceInput.focus();
                    priceInput.select();
                    activeField = 'price';
                }
            }
        }, 50);
    }
}

function handleDiscChange(e) {
    if (POS.isTransactionLocked) return;
    
    const cartId = e.target.dataset.cartId;
    let newDisc = parseFloat(e.target.value);
    const item = findCartItem(cartId);
    
    if (isNaN(newDisc) || newDisc < 0) newDisc = 0;
    
    // Validasi diskon tidak melebihi total harga
    if (item && newDisc > item.price * item.qty) {
        newDisc = item.price * item.qty;
        e.target.value = newDisc;
    }
    
    if (item && item.discount !== newDisc) {
        item.discount = newDisc;
        renderCart();
        // Kembalikan focus
        setTimeout(() => {
            const newInput = document.querySelector(`.cart-item[data-cart-id="${cartId}"] .disc-input`);
            if (newInput) {
                newInput.focus();
                newInput.select();
            }
        }, 50);
    }
}

function handleDescChange(e) {
    if (POS.isTransactionLocked) return;
    
    const cartId = e.target.dataset.cartId;
    const newDesc = e.target.value;
    const item = findCartItem(cartId);
    
    if (item && item.altDesc !== newDesc) {
        item.altDesc = newDesc;
        calculateAndDisplayTotals(); // Update totals without re-render
    }
}

// ========================================
// GRID EVENT BINDING
// ========================================

let activeField = null;

function bindCartGridEvents() {
    bindPriceEvents();
    bindQtyEvents();
    bindDiscountEvents();
    bindDescEvents();
    bindRemoveEvents();
    bindKeyboardNavigation();
    bindRowActivation();
}

function bindPriceEvents() {
    // Untuk price-input yang editable (priceChangeAllowed = true)
    document.querySelectorAll('.price-input.price-editable').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // Focus: auto select all text
        newInput.addEventListener('focus', (e) => {
            e.target.select();
            activeField = 'price';
            highlightActiveRow(e.target.closest('.cart-item'));
        });

        // Enter: pindah ke qty
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
                moveToNextField(e.target.closest('.cart-item'), 'qty');
            }
        });

        // Blur: update harga langsung
        newInput.addEventListener('blur', (e) => {
            handlePriceChange(e);
        });

        // Change: update harga langsung
        newInput.addEventListener('change', (e) => {
            handlePriceChange(e);
        });
    });

    // Untuk price-input yang non-editable (readonly)
    document.querySelectorAll('.price-input:not(.price-editable)').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('focus', (e) => {
            activeField = 'price';
            highlightActiveRow(e.target.closest('.cart-item'));
        });
    });
}

function bindQtyEvents() {
    document.querySelectorAll('.qty-input').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('focus', (e) => {
            e.target.select();
            activeField = 'qty';
            highlightActiveRow(e.target.closest('.cart-item'));
        });
        
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                moveToNextField(e.target.closest('.cart-item'), 'disc');
            }
        });
        
        newInput.addEventListener('change', (e) => {
            handleQtyChange(e);
        });
    });
}

function bindDiscountEvents() {
    document.querySelectorAll('.disc-input').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('focus', (e) => {
            e.target.select();
            activeField = 'disc';
            highlightActiveRow(e.target.closest('.cart-item'));
        });
        
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleDiscChange(e);
                moveToNextRow(e.target.closest('.cart-item'), 'price');
            }
        });
        
        newInput.addEventListener('blur', (e) => {
            handleDiscChange(e);
        });
    });
}

function bindDescEvents() {
    document.querySelectorAll('.cart-desc-input').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('blur', (e) => {
            handleDescChange(e);
        });
        
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
                moveToNextRow(e.target.closest('.cart-item'), 'price');
            }
        });
    });
}

function bindRemoveEvents() {
    document.querySelectorAll('.btn-remove').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
            if (POS.isTransactionLocked) return;
            const cartId = newBtn.dataset.cartId;
            const index = POS.cart.findIndex(item => item.cartId == cartId);
            if (index !== -1) {
                POS.cart.splice(index, 1);
                renderCart();
            }
        });
    });
}

// Keyboard Navigation
function bindKeyboardNavigation() {
    document.removeEventListener('keydown', handleKeyboardNavigation);
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleKeyboardNavigation(e) {
    if (POS.isTransactionLocked) return;
    
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.classList?.contains('qty-input') || 
                           activeElement.classList?.contains('price-input') || 
                           activeElement.classList?.contains('disc-input') ||
                           activeElement.classList?.contains('cart-desc-input');
    
    // Arrow Up/Down untuk navigasi row
    if (isInputFocused && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const currentRow = activeElement.closest('.cart-item');
        const currentIndex = parseInt(currentRow?.dataset.rowIndex || -1);
        
        if (e.key === 'ArrowUp' && currentIndex > 0) {
            moveToRow(currentIndex - 1, activeField);
        } else if (e.key === 'ArrowDown' && currentIndex < POS.cart.length - 1) {
            moveToRow(currentIndex + 1, activeField);
        }
    }
    
    // Tab dengan Shift untuk navigasi field
    if (isInputFocused && e.key === 'Tab') {
        e.preventDefault();
        const currentRow = activeElement.closest('.cart-item');
        const fields = ['price', 'qty', 'disc'];
        let currentFieldIndex = fields.indexOf(activeField);
        
        if (e.shiftKey) {
            currentFieldIndex--;
        } else {
            currentFieldIndex++;
        }
        
        if (currentFieldIndex >= 0 && currentFieldIndex < fields.length) {
            moveToField(currentRow, fields[currentFieldIndex]);
        } else if (currentFieldIndex >= fields.length) {
            const nextIndex = (parseInt(currentRow.dataset.rowIndex) + 1);
            if (nextIndex < POS.cart.length) {
                moveToRow(nextIndex, 'price');
            }
        } else if (currentFieldIndex < 0) {
            const prevIndex = (parseInt(currentRow.dataset.rowIndex) - 1);
            if (prevIndex >= 0) {
                moveToRow(prevIndex, 'disc');
            }
        }
    }
}

function moveToRow(rowIndex, fieldName) {
    const row = document.querySelector(`.cart-item[data-row-index="${rowIndex}"]`);
    if (row) {
        moveToField(row, fieldName);
    }
}

function moveToField(row, fieldName) {
    if (!row) return;
    
    let fieldSelector = '';
    switch(fieldName) {
        case 'price': fieldSelector = '.price-input'; break;
        case 'qty': fieldSelector = '.qty-input'; break;
        case 'disc': fieldSelector = '.disc-input'; break;
        default: fieldSelector = '.price-input';
    }
    
    const field = row.querySelector(fieldSelector);
    if (field && !field.disabled && !field.readOnly) {
        field.focus();
        field.select();
        activeField = fieldName;
    }
}

function moveToNextField(currentRow, nextField) {
    moveToField(currentRow, nextField);
}

function moveToNextRow(currentRow, fieldName) {
    const nextIndex = parseInt(currentRow.dataset.rowIndex) + 1;
    if (nextIndex < POS.cart.length) {
        moveToRow(nextIndex, fieldName);
    }
}

function highlightActiveRow(rowElement) {
    document.querySelectorAll('.cart-item').forEach(row => {
        row.classList.remove('active-row');
    });
    if (rowElement) {
        rowElement.classList.add('active-row');
    }
}

function setActiveRow(index) {
    const row = document.querySelector(`.cart-item[data-row-index="${index}"]`);
    if (row) {
        highlightActiveRow(row);
        moveToField(row, 'price');
    }
}

function bindRowActivation() {
    document.querySelectorAll('.cart-item').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            const index = parseInt(row.dataset.rowIndex);
            setActiveRow(index);
        });
    });
}

// ========================================
// RENDER MOBILE CART (PERTAHANKAN)
// ========================================

function renderMobileCart() {
    if (!DOM.mobileCartItems) return;

    if (POS.cart.length === 0) {
        DOM.mobileCartItems.innerHTML = `<div class="text-center text-muted py-4">Keranjang kosong</div>`;
        return;
    }

    let html = '';
    POS.cart.forEach(item => {
        const itemTotal = (item.price * item.qty) - (item.discount || 0);
        const isService = item.type === 'service';
        const isPPOB = item.type === 'ppob';

        let badgeHtml = '';
        if (isService) badgeHtml = '<span class="badge bg-warning" style="font-size: 0.6rem;">SVC</span>';
        if (isPPOB) badgeHtml = '<span class="badge bg-info" style="font-size: 0.6rem;">PPOB</span>';

        html += `
            <div class="mobile-cart-item" data-cart-id="${item.cartId}">
                <div class="mobile-cart-item-info">
                    <div class="mobile-cart-item-name">
                        ${escapeHtml(item.name)}
                        ${badgeHtml}
                    </div>
                    <div class="mobile-cart-item-price">${formatRupiah(item.price)}</div>
                </div>
                <div class="mobile-cart-item-actions">
                    <div class="mobile-cart-item-qty">
                        <button class="btn-qty-minus-mobile" data-cart-id="${item.cartId}">
                            <i class="bx bx-minus"></i>
                        </button>
                        <span class="qty-value">${item.qty}</span>
                        <button class="btn-qty-plus-mobile" data-cart-id="${item.cartId}">
                            <i class="bx bx-plus"></i>
                        </button>
                    </div>
                    <div class="mobile-cart-item-total">
                        ${formatRupiah(itemTotal)}
                    </div>
                    <button class="btn-remove-mobile" data-cart-id="${item.cartId}" title="Hapus item">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
                ${item.enableAltDesc && item.altDesc ? `
                    <div class="mobile-cart-item-desc">
                        <small><i class="bx bx-note"></i> ${escapeHtml(item.altDesc)}</small>
                    </div>
                ` : ''}
            </div>
        `;
    });
    DOM.mobileCartItems.innerHTML = html;

    // Attach event listeners untuk mobile cart
    attachMobileCartEvents();
}

function attachMobileCartEvents() {
    // Tombol minus mobile
    document.querySelectorAll('.btn-qty-minus-mobile').forEach(btn => {
        btn.removeEventListener('click', handleMobileMinusClick);
        btn.addEventListener('click', handleMobileMinusClick);
    });

    // Tombol plus mobile
    document.querySelectorAll('.btn-qty-plus-mobile').forEach(btn => {
        btn.removeEventListener('click', handleMobilePlusClick);
        btn.addEventListener('click', handleMobilePlusClick);
    });

    // Tombol hapus mobile
    document.querySelectorAll('.btn-remove-mobile').forEach(btn => {
        btn.removeEventListener('click', handleMobileRemoveClick);
        btn.addEventListener('click', handleMobileRemoveClick);
    });
}

function handleMobileMinusClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (POS.isTransactionLocked) return;
    const cartId = e.currentTarget.dataset.cartId;
    updateQuantity(cartId, -1);
}

function handleMobilePlusClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (POS.isTransactionLocked) return;
    const cartId = e.currentTarget.dataset.cartId;
    updateQuantity(cartId, 1);
}

function handleMobileRemoveClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (POS.isTransactionLocked) return;
    const cartId = e.currentTarget.dataset.cartId;
    removeFromCart(cartId);
}

// ========================================
// RENDER CART - CSS GRID VERSION (UTAMA)
// ========================================

function renderCart() {
    // Update badges
    const cartCount = POS.cart.reduce((sum, item) => sum + item.qty, 0);
    if (DOM.cartItemCount) DOM.cartItemCount.textContent = cartCount;
    if (DOM.mobileCartCount) DOM.mobileCartCount.textContent = cartCount;

    // Render desktop cart dengan tabel header
    if (DOM.cartItems) {
        // Header SELALU ditampilkan
        let html = `
            <div class="cart-header">
                <div class="cart-header-product">Produk</div>
                <div class="cart-header-price">Harga</div>
                <div class="cart-header-qty">Qty</div>
                <div class="cart-header-disc">Diskon</div>
                <div class="cart-header-total">Total</div>
                <div class="cart-header-action"></div>
            </div>
        `;

        // Konten (items atau empty state)
        if (POS.cart.length === 0) {
            html += `
                <div class="cart-empty">
                    <i class="bx bx-shopping-bag"></i>
                    <p class="mt-2">Keranjang belanja kosong</p>
                    <small class="text-muted">Scan barcode atau cari produk untuk memulai</small>
                </div>
            `;
        } else {
            POS.cart.forEach((item, index) => {
                html += createCartItemRow(item, index);
            });
        }

        // Assignment SEKALI saja
        DOM.cartItems.innerHTML = html;

        // Bind events hanya jika ada items
        if (POS.cart.length > 0) {
            bindCartGridEvents();
            setActiveRow(0);
        }
    }

    // Render mobile cart
    renderMobileCart();

    calculateAndDisplayTotals();
}

// Create single cart row dengan Grid
function createCartItemRow(item, index) {
    const itemTotal = (item.price * item.qty) - (item.discount || 0);
    const isService = item.type === 'service';
    const isPPOB = item.type === 'ppob';
    const hasStockLimit = !isService && !isPPOB;
    const isPriceEditable = item.priceChangeAllowed && !isPPOB;
    const needQtyInput = item.defaultQty || isService || isPPOB;

    let badgeHtml = '';
    if (item.type === 'service') badgeHtml = '<span class="badge bg-warning">SVC</span>';
    if (item.type === 'ppob') badgeHtml = '<span class="badge bg-info">PPOB</span>';
    if (item.defaultQty) badgeHtml += '<span class="badge bg-secondary ms-1">Qty</span>';

    return `
        <div class="cart-item ${item.qty === 0 ? 'need-qty' : ''}" data-cart-id="${item.cartId}" data-row-index="${index}">
            <div class="cart-row">
                <!-- Product Column -->
                <div class="cart-col product">
                    <div class="cart-product-name" title="${escapeHtml(item.name)}">
                        ${escapeHtml(truncateText(item.name, 30))}
                        ${badgeHtml}
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
                
                <!-- Price Column -->
                <div class="cart-col price">
                    <input type="number"
                        class="form-control form-control-sm price-input ${isPriceEditable ? 'price-editable' : ''}"
                        data-cart-id="${item.cartId}"
                        data-field="price"
                        value="${item.price}"
                        step="1000"
                        min="0"
                        ${isPriceEditable ? '' : 'readonly'}
                        ${isPriceEditable ? 'style="background-color: #fff3e0;"' : 'style="background-color: #f8f9fa;"'}>
                </div>
                
                <!-- Quantity Column -->
                <div class="cart-col qty">
                    <input type="number"
                        class="form-control form-control-sm qty-input ${needQtyInput && item.qty === 0 ? 'highlight-qty' : ''}"
                        data-cart-id="${item.cartId}"
                        data-field="qty"
                        value="${item.qty}"
                        min="${needQtyInput ? '0' : '1'}"
                        step="1"
                        ${hasStockLimit ? `max="${item.stock}"` : ''}
                        placeholder="${needQtyInput ? 'Isi qty' : ''}">
                </div>
                
                <!-- Discount Column -->
                <div class="cart-col disc">
                    <input type="number"
                        class="form-control form-control-sm disc-input"
                        data-cart-id="${item.cartId}"
                        data-field="discount"
                        value="${item.discount || 0}"
                        step="1000"
                        min="0">
                </div>
                
                <!-- Total Column -->
                <div class="cart-col total">
                    ${formatRupiah(itemTotal)}
                </div>
                
                <!-- Action Column -->
                <div class="cart-col action">
                    <button class="btn btn-sm btn-remove"
                            data-cart-id="${item.cartId}"
                            title="Hapus item">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== CALCULATIONS ====================
function calculateTotals() {
    let subtotal = 0;
    let taxAmount = 0;
    
    POS.cart.forEach(item => {
        // Hitung total per item (harga * qty)
        let itemTotal = item.price * item.qty;
        
        // Kurangi dengan diskon per produk (jika ada)
        const itemDiscount = item.discount || 0;
        itemTotal = Math.max(0, itemTotal - itemDiscount);
        
        subtotal += itemTotal;
        
        // Tax dihitung dari total setelah diskon (atau sebelum diskon? Sesuai kebutuhan)
        // Biasanya tax dihitung dari harga sebelum diskon
        // Sesuaikan dengan kebijakan toko Anda
        if (item.tax && item.tax > 0) {
            // Opsi 1: Tax dari harga sebelum diskon
            const itemSubtotalBeforeDiscount = item.price * item.qty;
            taxAmount += itemSubtotalBeforeDiscount * (item.tax / 100);
            
            // Opsi 2: Tax dari harga setelah diskon (uncomment jika ingin)
            // taxAmount += itemTotal * (item.tax / 100);
        }
    });
    
    // Ambil diskon global (dari input form)
    const globalDiscount = parseFloat(DOM.discountInput?.value) || 0;
    
    // Total akhir: subtotal + tax - diskon global
    const total = Math.max(0, subtotal + taxAmount - globalDiscount);
    
    return { subtotal, taxAmount, globalDiscount, total };
}

function calculateAndDisplayTotals() {
    const { subtotal, taxAmount, globalDiscount, total } = calculateTotals();
    
    if (DOM.subtotal) DOM.subtotal.textContent = formatRupiah(subtotal);
    if (DOM.taxAmount) DOM.taxAmount.textContent = formatRupiah(taxAmount);
    if (DOM.discountInput) DOM.discountInput.value = globalDiscount;
    if (DOM.total) DOM.total.textContent = formatRupiah(total);
    if (DOM.mobileTotal) DOM.mobileTotal.textContent = formatRupiah(total);
    
    return { subtotal, taxAmount, globalDiscount, total };
}

// ==================== CUSTOMER MANAGEMENT ====================
function initializeCustomerSearch() {
    const searchInput = document.getElementById('customerSearchInput');
    if (!searchInput) return;
    
    searchInput.value = 'Walk-in Customer';
    
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim();
        
        if (keyword === '' || keyword === 'Walk-in Customer') {
            hideCustomerDropdown();
            resetToDefaultCustomer();
            return;
        }
        
        clearTimeout(POS.customerSearchTimeout);
        if (keyword.length < 2) {
            hideCustomerDropdown();
            return;
        }
        
        POS.customerSearchTimeout = setTimeout(() => performCustomerSearch(keyword), 300);
    });
    
    searchInput.addEventListener('keydown', handleCustomerKeydown);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.position-relative')) hideCustomerDropdown();
    });
    
    document.getElementById('clearCustomerBtn')?.addEventListener('click', resetToDefaultCustomer);
}

function resetToDefaultCustomer() {
    POS.selectedCustomer = null;
    document.getElementById('customerId').value = '';
    document.getElementById('customerSearchInput').value = 'Walk-in Customer';
    document.getElementById('clearCustomerBtn').style.display = 'none';
    hideCustomerDropdown();
}

async function performCustomerSearch(keyword) {
    try {
        const response = await fetch(`/pos/search-customers?q=${encodeURIComponent(keyword)}`);
        const data = await response.json();
        
        if (data.customers?.length > 0) {
            POS.currentCustomerResults = data.customers;
            POS.selectedCustomerIndex = -1;
            renderCustomerDropdown(POS.currentCustomerResults);
            showCustomerDropdown();
        } else {
            hideCustomerDropdown();
        }
    } catch (error) {
        console.error('Customer search error:', error);
        hideCustomerDropdown();
    }
}

function renderCustomerDropdown(customers) {
    const listContainer = document.getElementById('customerResultsList');
    if (!listContainer) return;
    
    if (!customers?.length) {
        listContainer.innerHTML = '<div class="text-center text-muted py-3"><small>Tidak ada customer ditemukan</small></div>';
        return;
    }
    
    let html = '';
    customers.forEach((customer, index) => {
        const isMember = customer.type === 'member';
        html += `
            <div class="customer-dropdown-item" data-index="${index}" data-id="${customer.id}">
                <div class="customer-dropdown-item-info">
                    <div class="customer-dropdown-item-name">${escapeHtml(customer.name)}</div>
                    <div class="customer-dropdown-item-phone">${customer.phone || '-'}</div>
                </div>
                <div class="customer-dropdown-item-type ${isMember ? 'member' : ''}">${isMember ? 'Member' : 'Umum'}</div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
    
    document.querySelectorAll('.customer-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const customer = POS.currentCustomerResults.find(c => c.id === id);
            if (customer) selectCustomer(customer);
        });
        item.addEventListener('mouseenter', () => {
            const index = parseInt(item.dataset.index);
            setSelectedCustomerIndex(index);
        });
    });
}

function selectCustomer(customer) {
    POS.selectedCustomer = customer;
    document.getElementById('customerId').value = customer.id;
    document.getElementById('customerSearchInput').value = `${customer.name}${customer.phone ? ` - ${customer.phone}` : ''}`;
    document.getElementById('clearCustomerBtn').style.display = 'inline-flex';
    hideCustomerDropdown();
}

function handleCustomerKeydown(e) {
    const dropdown = document.getElementById('customerDropdown');
    if (!dropdown || dropdown.style.display === 'none') return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextCustomerResult();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPreviousCustomerResult();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (POS.selectedCustomerIndex >= 0 && POS.currentCustomerResults[POS.selectedCustomerIndex]) {
            selectCustomer(POS.currentCustomerResults[POS.selectedCustomerIndex]);
        }
    } else if (e.key === 'Escape') {
        hideCustomerDropdown();
    }
}

function selectNextCustomerResult() {
    if (POS.currentCustomerResults.length === 0) return;
    POS.selectedCustomerIndex = (POS.selectedCustomerIndex + 1) % POS.currentCustomerResults.length;
    updateSelectedCustomerItem();
}

function selectPreviousCustomerResult() {
    if (POS.currentCustomerResults.length === 0) return;
    POS.selectedCustomerIndex = (POS.selectedCustomerIndex - 1 + POS.currentCustomerResults.length) % POS.currentCustomerResults.length;
    updateSelectedCustomerItem();
}

function setSelectedCustomerIndex(index) {
    POS.selectedCustomerIndex = index;
    updateSelectedCustomerItem();
}

function updateSelectedCustomerItem() {
    document.querySelectorAll('.customer-dropdown-item').forEach((item, i) => {
        if (i === POS.selectedCustomerIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function showCustomerDropdown() {
    const dropdown = document.getElementById('customerDropdown');
    if (dropdown) dropdown.style.display = 'block';
}

function hideCustomerDropdown() {
    const dropdown = document.getElementById('customerDropdown');
    if (dropdown) dropdown.style.display = 'none';
    POS.currentCustomerResults = [];
    POS.selectedCustomerIndex = -1;
}

// ==================== TRANSACTIONS ====================
async function handleCompleteOrder() {
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Silakan tambahkan produk terlebih dahulu');
        return;
    }
    
    const { total } = calculateTotals();
    showPaymentModal(total);
}

async function handleCashPayment() {
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Silakan tambahkan produk terlebih dahulu');
        return;
    }
    
    const { total } = calculateTotals();
    const confirmed = confirm(`Total belanja: ${formatRupiah(total)}\nBayar dengan cash?`);
    
    if (confirmed) {
        await processTransaction({ paymentMethod: 'cash', amountReceived: total, change: 0 });
    }
}

async function handleNonCashPayment(method) {
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Silakan tambahkan produk terlebih dahulu');
        return;
    }
    
    const { total } = calculateTotals();
    const confirmed = confirm(`Total belanja: ${formatRupiah(total)}\nBayar dengan ${method.toUpperCase()}?`);
    
    if (confirmed) {
        await processTransaction({ paymentMethod: method, amountReceived: total, change: 0 });
    }
}

function showPaymentModal(total) {
    const modalElement = document.getElementById('paymentModal');
    const totalSpan = document.getElementById('paymentTotalAmount');
    const amountInput = document.getElementById('paymentAmount');
    const changeSpan = document.getElementById('paymentChange');
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const cashGroup = document.querySelector('.cash-amount-group');
    
    if (!modalElement) return;
    
    let selectedMethod = 'cash';
    
    // Set total
    if (totalSpan) totalSpan.textContent = formatRupiah(total);
    if (amountInput) amountInput.value = total;
    
    // Payment method selection
    document.querySelectorAll('[data-method]').forEach(btn => {
        btn.removeEventListener('click', () => {});
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-method]').forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-outline-primary');
            selectedMethod = btn.dataset.method;
            
            const isCash = selectedMethod === 'cash';
            if (cashGroup) cashGroup.style.display = isCash ? 'block' : 'none';
            if (confirmBtn) confirmBtn.disabled = !isCash;
            
            if (isCash && amountInput) {
                amountInput.value = total;
                calculateChange();
            }
        });
    });
    
    // Quick amount buttons
    document.querySelectorAll('[data-quick]').forEach(btn => {
        btn.removeEventListener('click', () => {});
        btn.addEventListener('click', () => {
            const quick = btn.dataset.quick;
            if (quick === 'round') {
                amountInput.value = Math.ceil(total / 1000) * 1000;
            } else if (quick === 'exact') {
                amountInput.value = total;
            } else {
                amountInput.value = total + parseInt(quick);
            }
            calculateChange();
        });
    });
    
    function calculateChange() {
        const received = parseFloat(amountInput?.value) || 0;
        const change = received - total;
        if (changeSpan) {
            changeSpan.textContent = formatRupiah(Math.abs(change));
            changeSpan.style.color = change >= 0 ? '#2ecc71' : '#e74c3c';
            if (confirmBtn) confirmBtn.disabled = change < 0;
        }
    }
    
    amountInput?.addEventListener('input', calculateChange);
    amountInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !confirmBtn.disabled) {
            confirmPayment(modalElement, total, selectedMethod);
        }
    });
    
    confirmBtn?.addEventListener('click', () => confirmPayment(modalElement, total, selectedMethod));
    
    // Set default active method
    const defaultBtn = document.querySelector('[data-method="cash"]');
    if (defaultBtn) {
        defaultBtn.classList.add('active', 'btn-primary');
        defaultBtn.classList.remove('btn-outline-primary');
    }
    if (cashGroup) cashGroup.style.display = 'block';
    calculateChange();
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    setTimeout(() => {
        const amountInput = document.getElementById('paymentAmount');
        if (amountInput) {
            amountInput.focus();
            amountInput.select();
        }
    }, 300);
}

async function confirmPayment(modalElement, total, selectedMethod) {
    const { subtotal, taxAmount, discount } = calculateTotals();
    const notes = document.getElementById('paymentNotes')?.value || '';
    const customerId = document.getElementById('customerId')?.value || null;
    
    let received = total;
    let change = 0;
    
    if (selectedMethod === 'cash') {
        received = parseFloat(document.getElementById('paymentAmount')?.value) || 0;
        change = received - total;
        if (received < total) {
            showError('Pembayaran Kurang', 'Jumlah yang diterima kurang dari total');
            return;
        }
    }
    
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();
    
    await processTransaction({ subtotal, taxAmount, discount, total, paymentMethod: selectedMethod, amountReceived: received, change, notes, customerId });
}

async function processTransaction(paymentData) {
    const { subtotal, taxAmount, discount, total, paymentMethod, amountReceived, change, notes, customerId } = paymentData;
    
    const transactionData = {
        customerId: customerId || null,
        items: POS.cart.map(item => ({
            productId: item.id,
            quantity: item.qty,
            price: item.price,
            subtotal: item.price * item.qty,
            tax: item.tax || 0,
            altDesc: item.altDesc || null
        })),
        subtotal: subtotal || calculateTotals().subtotal,
        tax: taxAmount || calculateTotals().taxAmount,
        discount: discount || calculateTotals().discount,
        total: total || calculateTotals().total,
        paymentMethod: paymentMethod,
        amountReceived: amountReceived,
        change: change,
        notes: notes || ''
    };
    
    const headers = { 'Content-Type': 'application/json' };
    // if (POS.csrfToken) headers['CSRF-Token'] = POS.csrfToken;
    
    try {
        const response = await fetch('/pos/save-transaction', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessModal(result.orderNumber, transactionData);
        } else {
            showError('Error', result.message || 'Transaksi gagal');
        }
    } catch (error) {
        console.error('Transaction error:', error);
        showError('Error', 'Gagal menyimpan transaksi');
    }
}

function showSuccessModal(orderNumber, transactionData) {
    const { total, change, paymentMethod, amountReceived } = transactionData;
    const isCash = paymentMethod === 'cash';
    const hasChange = change > 0;
    
    const methodNames = { cash: 'Tunai', card: 'Kartu', transfer: 'Transfer', qris: 'QRIS' };
    const methodIcons = { cash: 'bx-money', card: 'bx-credit-card', transfer: 'bx-transfer', qris: 'bx-qr' };
    
    const modalElement = document.getElementById('successModal');
    if (!modalElement) return;
    
    // Update modal content
    const orderSpan = document.getElementById('successOrderNumber');
    const changeCard = document.getElementById('successChangeCard');
    const changeAmount = document.getElementById('successChangeAmount');
    const totalSpan = document.getElementById('successTotal');
    const paidRow = document.getElementById('successPaidRow');
    const paidSpan = document.getElementById('successPaid');
    const methodSpan = document.getElementById('successMethod');
    
    if (orderSpan) orderSpan.textContent = `Order #${orderNumber}`;
    if (changeCard) changeCard.style.display = (isCash && hasChange) ? 'block' : 'none';
    if (changeAmount) changeAmount.textContent = formatRupiah(change);
    if (totalSpan) totalSpan.textContent = formatRupiah(total);
    if (paidRow) paidRow.style.display = isCash ? 'flex' : 'none';
    if (paidSpan) paidSpan.textContent = formatRupiah(amountReceived);
    if (methodSpan) methodSpan.innerHTML = `<i class="bx ${methodIcons[paymentMethod]}"></i> ${methodNames[paymentMethod]}`;
    
    // Set button handlers
    const printBtn = document.getElementById('printReceiptBtn');
    const newBtn = document.getElementById('newTransactionBtn');
    
    // Remove old listeners
    const newPrintBtn = printBtn?.cloneNode(true);
    const newNewBtn = newBtn?.cloneNode(true);
    if (printBtn && newPrintBtn) printBtn.parentNode?.replaceChild(newPrintBtn, printBtn);
    if (newBtn && newNewBtn) newBtn.parentNode?.replaceChild(newNewBtn, newBtn);
    
    newPrintBtn?.addEventListener('click', () => printReceipt(orderNumber, transactionData));
    newNewBtn?.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        POS.cart = [];
        renderCart();
        if (DOM.discountInput) DOM.discountInput.value = '0';
        resetToDefaultCustomer();
        setTimeout(() => DOM.searchProduct?.focus(), 100);
    });
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function printReceipt(orderNumber, transactionData) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const now = new Date();
    const customerName = document.getElementById('customerSearchInput')?.value || 'Walk-in Customer';
    
    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Struk #${orderNumber}</title>
        <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
            .header { text-align: center; border-bottom: 1px dashed #000; margin-bottom: 8px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
            .footer { text-align: center; border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; }
        </style>
        </head>
        <body>
            <div class="header"><h3>TOKO ANDA</h3><p>Jl. Contoh No. 123</p></div>
            <div>${now.toLocaleString()}</div>
            <div>Order #: ${orderNumber}</div>
            <div>Customer: ${customerName}</div>
            <div class="divider"></div>
            ${transactionData.items.map(item => `
                <div>${escapeHtml(item.name)} x ${item.quantity}</div>
                <div style="text-align: right">${formatRupiah(item.total)}</div>
            `).join('')}
            <div class="divider"></div>
            <div class="total-row"><span>Total</span><span>${formatRupiah(transactionData.total)}</span></div>
            ${transactionData.paymentMethod === 'cash' ? `<div class="total-row"><span>Dibayar</span><span>${formatRupiah(transactionData.amountReceived)}</span></div>` : ''}
            <div class="footer">Terima Kasih</div>
        </body>
        </html>
    `;
    
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
}

// ==================== LOCK / UNLOCK TRANSACTION ====================
function lockTransaction() {
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Tidak ada transaksi yang dapat di-lock');
        return;
    }
    
    POS.isTransactionLocked = true;
    updateLockUI(true);
    showNotification('Info', 'Transaksi telah di-lock', 'info');
}

function unlockTransaction() {
    POS.isTransactionLocked = false;
    updateLockUI(false);
    showNotification('Info', 'Transaksi telah di-unlock', 'info');
}

function updateLockUI(isLocked) {
    const lockBtn = document.getElementById('lockTransactionBtn');
    const unlockBtn = document.getElementById('unlockTransactionBtn');
    const statusSpan = document.getElementById('transactionStatus');
    
    if (lockBtn) lockBtn.style.display = isLocked ? 'none' : 'flex';
    if (unlockBtn) unlockBtn.style.display = isLocked ? 'flex' : 'none';
    if (statusSpan) {
        statusSpan.innerHTML = isLocked 
            ? '<i class="bx bx-lock text-warning"></i><span>Locked</span>'
            : '<i class="bx bx-check-circle text-success"></i><span>Active</span>';
    }
    
    // Disable interactive elements
    const selectors = ['.qty-input', '.btn-remove', '#clearCartBtn', '#discountInput'];
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.disabled = isLocked;
            if (el.classList) el.classList.toggle('opacity-50', isLocked);
        });
    });
}

function voidTransaction() {
    if (POS.isTransactionLocked) {
        showError('Transaksi Terkunci', 'Unlock terlebih dahulu');
        return;
    }
    
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Tidak ada transaksi yang dapat di-void');
        return;
    }
    
    if (confirm('Yakin ingin membatalkan seluruh transaksi ini?')) {
        POS.cart = [];
        renderCart();
        showNotification('Success', 'Transaksi telah dibatalkan', 'success');
    }
}

function saveTransaction() {
    if (POS.cart.length === 0) {
        showError('Cart Kosong', 'Tidak ada transaksi yang dapat disimpan');
        return;
    }
    
    const draft = {
        cart: POS.cart,
        customer: POS.selectedCustomer,
        discount: DOM.discountInput?.value || '0',
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('pos_draft_transaction', JSON.stringify(draft));
    showNotification('Success', 'Transaksi disimpan sebagai draft', 'success');
}

// ==================== KEYBOARD SHORTCUTS ====================
function handleKeyboardShortcuts(e) {
    // F1 = Focus search
    if (e.key === 'F1') {
        e.preventDefault();
        DOM.searchProduct?.focus();
        DOM.searchProduct?.select();
    }
    // F2 = Focus customer search
    else if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('customerSearchInput')?.focus();
    }
    // F3 = Clear cart
    else if (e.key === 'F3') {
        e.preventDefault();
        handleClearCart();
    }
    // F4 = Checkout
    else if (e.key === 'F4') {
        e.preventDefault();
        handleCompleteOrder();
    }
    // F8 = Menu (slide panel)
    else if (e.key === 'F8') {
        e.preventDefault();
        openSlidePanel();
    }
    // F9 = Cash payment
    else if (e.key === 'F9') {
        e.preventDefault();
        handleCashPayment();
    }
    // Ctrl+D = Discount
    else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        DOM.discountInput?.focus();
        DOM.discountInput?.select();
    }
    // Ctrl+S = Save
    else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveTransaction();
    }
    // Ctrl+L = Lock
    else if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        lockTransaction();
    }
    // Ctrl+V = Void
    else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        voidTransaction();
    }
    // Escape
    else if (e.key === 'Escape') {
        if (DOM.searchProduct && document.activeElement === DOM.searchProduct) {
            DOM.searchProduct.value = '';
            hideSearchDropdown();
        }
    }
}

function openSlidePanel() {
    const slidePanel = document.getElementById('slidePanel');
    const slideOverlay = document.getElementById('slideOverlay');
    if (slidePanel) slidePanel.classList.add('open');
    if (slideOverlay) slideOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// ==================== MOBILE SLIDE PANEL ====================
function initializeMobileMenu() {
    const menuButtons = ['openSlidePanelBtn', 'mobileMenuBtn', 'mobileMenuNavBtn'];
    const slidePanel = document.getElementById('slidePanel');
    const slideOverlay = document.getElementById('slideOverlay');
    const closeBtn = document.getElementById('closeSlidePanel');

    if (!slidePanel) return;

    window.openSlidePanel = function() {
        slidePanel.classList.add('open');
        if (slideOverlay) slideOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    function closePanel() {
        slidePanel.classList.remove('open');
        if (slideOverlay) slideOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    menuButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', window.openSlidePanel);
    });

    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (slideOverlay) slideOverlay.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && slidePanel.classList.contains('open')) {
            closePanel();
        }
    });
}

function syncSlidePanelButtons() {
    const buttonMappings = {
        'dailyReportBtnSlide': 'dailyReportBtn',
        'xReadingBtnSlide': 'xReadingBtn',
        'zReadingBtnSlide': 'zReadingBtn',
        'saveTransactionBtnSlide': 'saveTransactionBtn',
        'lockTransactionBtnSlide': 'lockTransactionBtn',
        'unlockTransactionBtnSlide': 'unlockTransactionBtn',
        'voidItemBtnSlide': 'voidItemBtn',
        'voidTransactionBtnSlide': 'voidTransactionBtn',
        'clearCartBtnSlide': 'clearCartBtn',
        'refreshCartBtnSlide': 'refreshCartBtn'
    };

    Object.entries(buttonMappings).forEach(([slideId, mainId]) => {
        const slideBtn = document.getElementById(slideId);
        const mainBtn = document.getElementById(mainId);
        if (slideBtn && mainBtn) {
            slideBtn.addEventListener('click', (e) => {
                mainBtn.click();
                if (window.innerWidth <= 768) {
                    const panel = document.getElementById('slidePanel');
                    const overlay = document.getElementById('slideOverlay');
                    if (panel) panel.classList.remove('open');
                    if (overlay) overlay.classList.remove('show');
                    document.body.style.overflow = '';
                }
            });
        }
    });

    // Sync lock state
    setInterval(() => {
        const mainLockBtn = document.getElementById('lockTransactionBtn');
        const mainUnlockBtn = document.getElementById('unlockTransactionBtn');
        const slideLockBtn = document.getElementById('lockTransactionBtnSlide');
        const slideUnlockBtn = document.getElementById('unlockTransactionBtnSlide');
        
        if (mainLockBtn && slideLockBtn && mainUnlockBtn && slideUnlockBtn) {
            const isLocked = mainLockBtn.style.display === 'none';
            slideLockBtn.style.display = isLocked ? 'none' : 'flex';
            slideUnlockBtn.style.display = isLocked ? 'flex' : 'none';
        }
    }, 100);
}

// ==================== HELPER FUNCTIONS ====================
function formatRupiah(amount) {
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(title, message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({ title, text: message, icon: 'error', confirmButtonText: 'OK' });
    } else {
        alert(`${title}: ${message}`);
    }
}

function showNotification(title, message, type = 'info') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({ title, text: message, icon: type, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
}