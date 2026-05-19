/**
 * POS System - Main JavaScript
 * Handles cart management, product search, barcode scanning, and transaction processing
 */

// POS State
let cart = [];
let globalTaxRate = 11;
let currentUser = null;

// DOM Elements
const elements = {};

// Initialize POS
document.addEventListener('DOMContentLoaded', async () => {
    initializeElements();
    initializeEventListeners();
    initializeScrollbars();
    initializeModals();
    
    await loadFavoriteProducts('all');

    // Focus ke search product
    if (elements.searchProduct) elements.searchProduct.focus(); 
});

// Initialize DOM elements
function initializeElements() {
    elements.cartItems = document.getElementById('cartItems');
    elements.subtotal = document.getElementById('subtotal');
    elements.taxAmount = document.getElementById('taxAmount');
    elements.total = document.getElementById('total');
    elements.discountInput = document.getElementById('discountInput');
    elements.searchProduct = document.getElementById('searchProduct');
    elements.clearCartBtn = document.getElementById('clearCartBtn');
    elements.completeOrderBtn = document.getElementById('completeOrderBtn');
    elements.productsGrid = document.getElementById('productsGrid');
    elements.taxRateSpan = document.getElementById('taxRate');
}

// Initialize Modals
function initializeModals() {
    // Buat modal edit harga jika belum ada
    if (!document.getElementById('editPriceModal')) {
        const modalHtml = `
            <div class = "modal modal-top fade"
            id = "editPriceModal"
            tabindex = "-1" >
                <div class="modal-dialog modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Ubah Harga</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="editPriceProductId">
                            <div class="mb-3">
                                <label class="form-label">Nama Produk</label>
                                <div class="form-control bg-light" id="editPriceProductName"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Harga Baru</label>
                                <input type="number" class="form-control" id="editPriceNewPrice" step="100" min="0">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-primary" id="savePriceBtn">Simpan</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const priceInput = document.getElementById('editPriceNewPrice');
        if (priceInput) {
            priceInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEditedPrice();
                }
            });
        }

        const savePriceBtn = document.getElementById('savePriceBtn');
        if (savePriceBtn) {
            savePriceBtn.addEventListener('click', () => saveEditedPrice());
        }
    }

    // Buat modal edit deskripsi jika belum ada
    if (!document.getElementById('editDescModal')) {
        const modalHtml = `
            <div class = "modal modal-top fade"
            id = "editDescModal"
            tabindex = "-1" >
                <div class="modal-dialog modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Tambah Deskripsi</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <input type="hidden" id="editDescProductId">
                            <div class="mb-3">
                                <label class="form-label">Nama Produk</label>
                                <div class="form-control bg-light" id="editDescProductName"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Deskripsi Alternatif</label>
                                <input type="text" class="form-control" id="editDescText" placeholder="Contoh: Ukuran M, Warna Merah, Catatan khusus...">
                                <small class="text-muted">Deskripsi ini akan muncul di struk dan laporan</small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-primary" id="saveDescBtn">Simpan</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const descInputText = document.getElementById('editDescText');
        if (descInputText) {
            descInputText.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEditedDescription();
                }
            });
        }

        const saveDescBtn = document.getElementById('saveDescBtn');
        if (saveDescBtn) {
            saveDescBtn.addEventListener('click', () => saveEditedDescription());
        }
    }
}

// Initialize Perfect Scrollbar
function initializeScrollbars() {
    const productGrid = document.querySelector('.pos-products-container');
    const cartContainer = document.querySelector('.pos-cart-scroll');
    
    if (productGrid && typeof PerfectScrollbar !== 'undefined') {
        new PerfectScrollbar(productGrid);
    }
    if (cartContainer) {
        // Pastikan overflow auto
        cartContainer.style.overflowY = 'auto';
        cartContainer.style.overflowX = 'hidden';
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    initializeSearch();
    initializePriceConfirmModal();
    initializeCustomerSearch();
    
    // Add to cart (delegation)
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.btn-add-cart');
        if (addBtn) handleAddToCart(addBtn);

        const minusBtn = e.target.closest('.btn-qty-minus');
        if (minusBtn) handleQuantityChange(minusBtn, -1);

        const plusBtn = e.target.closest('.btn-qty-plus');
        if (plusBtn) handleQuantityChange(plusBtn, 1);

        const removeBtn = e.target.closest('.btn-remove');
        if (removeBtn) handleRemoveFromCart(removeBtn);

        const editPriceBtn = e.target.closest('.btn-edit-price');
        if (editPriceBtn) showEditPriceModal(editPriceBtn);

        const editDescBtn = e.target.closest('.btn-edit-desc');
        if (editDescBtn) showEditDescModal(editDescBtn);
    });

    // Category filter
    const categoryBtns = document.querySelectorAll('.pos-category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => handleCategoryFilter(btn));
    });

    // Discount input
    if (elements.discountInput) {
        elements.discountInput.addEventListener('input', () => calculateAndRenderTotals());
    }

    // Cart actions
    if (elements.clearCartBtn) {
        elements.clearCartBtn.addEventListener('click', () => handleClearCart());
    }

    if (elements.completeOrderBtn) {
        elements.completeOrderBtn.addEventListener('click', () => handleCompleteOrder());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ==================== SEARCH WITH DROPDOWN ====================

let searchTimeout = null;
let currentSearchResults = [];
let selectedSearchIndex = -1;

function initializeSearch() {
    const searchInput = elements.searchProduct;
    if (!searchInput) return;
    
    // Input event dengan debounce
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (keyword.length < 2) {
            hideSearchDropdown();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(keyword);
        }, 300);
    });

    // Handle Enter untuk barcode atau search
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const keyword = searchInput.value.trim();
            
            // Jika keyword panjang dan mirip barcode (angka semua), cek langsung
            if (/^\d+$/.test(keyword) && keyword.length >= 8) {
                e.preventDefault();
                handleBarcodeDirect(keyword);
            }
        }
    });

    async function handleBarcodeDirect(barcode) {
        try {
            const response = await fetch(`/pos/api/products/barcode/${encodeURIComponent(barcode)}`);
            const data = await response.json();

            if (data.success && data.product) {
                const cartProduct = {
                    id: data.product.id,
                    name: data.product.name,
                    price: data.product.salePrice,
                    originalPrice: data.product.salePrice,
                    stock: data.product.stock || 999999,
                    code: data.product.code || '',
                    tax: data.product.tax || 0,
                    enableTax: data.product.enableInputTax || false,
                    enableAltDesc: data.product.enableAltDesc || false,
                    priceChangeAllowed: data.product.priceChangeAllowed || false,
                    type: data.product.type || 'fisik',
                    service: data.product.service || false,
                    isService: data.product.service === true,
                    isPPOB: data.product.type === 'ppob'
                };

                // Tampilkan modal konfirmasi harga
                showPriceConfirmModal(cartProduct);

                elements.searchProduct.value = '';
                hideSearchDropdown();
            } else {
                showError('Not Found', 'Produk tidak ditemukan');
            }
        } catch (error) {
            console.error('Error scanning barcode:', error);
            showError('Error', 'Gagal memindai barcode');
        }
    }

    // Keyboard navigation untuk dropdown
    searchInput.addEventListener('keydown', (e) => {
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
            if (selectedSearchIndex >= 0 && currentSearchResults[selectedSearchIndex]) {
                addToCartFromSearch(currentSearchResults[selectedSearchIndex]);
                searchInput.value = '';
                hideSearchDropdown();
            }
        } else if (e.key === 'Escape') {
            hideSearchDropdown();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.pos-search-group')) {
            hideSearchDropdown();
        }
    });
}

async function performSearch(keyword) {
    try {
        const response = await fetch(`/pos/api/products/search?q=${encodeURIComponent(keyword)}`);
        const data = await response.json();
        
        if (data.success && data.products) {
            currentSearchResults = data.products.slice(0, 10);
            selectedSearchIndex = -1;
            renderSearchDropdown(currentSearchResults);
            showSearchDropdown();
        } else {
            hideSearchDropdown();
        }
    } catch (error) {
        console.error('Search error:', error);
        hideSearchDropdown();
    }
}

function renderSearchDropdown(products) {
    const listContainer = document.getElementById('searchResultsList');
    if (!listContainer) return;
    
    if (!products || products.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                <small>Tidak ada produk ditemukan</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    products.forEach((product, index) => {
        const isService = product.service === true;
        const isPPOB = product.type === 'ppob';
        
        html += `
            <div class="search-dropdown-item" data-index="${index}" data-id="${product.id}">
                <img class="search-dropdown-item-image" 
                     src="${product.image || '/assets/img/elements/images.png'}" 
                     onerror="this.src='/assets/img/elements/images.png'">
                <div class="search-dropdown-item-info">
                    <div class="search-dropdown-item-name">
                        ${escapeHtml(product.name)}
                        ${isPPOB ? '<span class="badge bg-info search-dropdown-item-badge">PPOB</span>' : ''}
                        ${isService ? '<span class="badge bg-warning search-dropdown-item-badge">Service</span>' : ''}
                    </div>
                    <div class="search-dropdown-item-code">
                        ${product.code || ''} ${product.barcode ? `| ${product.barcode}` : ''}
                    </div>
                </div>
                <div class="search-dropdown-item-price">
                    ${formatRupiah(product.salePrice)}
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
    
    document.querySelectorAll('.search-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const product = currentSearchResults.find(p => p.id === id);
            if (product) {
                addToCartFromSearch(product);
                elements.searchProduct.value = '';
                hideSearchDropdown();
            }
        });
        
        item.addEventListener('mouseenter', () => {
            const index = parseInt(item.dataset.index);
            setSelectedIndex(index);
        });
    });
}

// ==================== CUSTOMER MANAGEMENT (DROPDOWN VERSION) ====================

let selectedCustomer = null;
let customerSearchTimeout = null;
let currentCustomerResults = [];
let selectedCustomerIndex = -1;

// Initialize customer search with dropdown
function initializeCustomerSearch() {
    const searchInput = document.getElementById('customerSearchInput');
    if (!searchInput) return;

    // Set default value
    if (!selectedCustomer) {
        searchInput.value = 'Walk-in Customer';
    }

    // Input event dengan debounce
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim();

        // Jika keyword kosong, reset ke default customer
        if (keyword === '' || keyword === 'Walk-in Customer') {
            hideCustomerDropdown();
            resetToDefaultCustomer();
            return;
        }

        clearTimeout(customerSearchTimeout);

        if (keyword.length < 2) {
            hideCustomerDropdown();
            return;
        }

        customerSearchTimeout = setTimeout(() => {
            performCustomerSearch(keyword);
        }, 300);
    });

    // Keyboard navigation untuk dropdown
    searchInput.addEventListener('keydown', (e) => {
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
            if (selectedCustomerIndex >= 0 && currentCustomerResults[selectedCustomerIndex]) {
                selectCustomer(currentCustomerResults[selectedCustomerIndex]);
                searchInput.value = getCustomerDisplayText(currentCustomerResults[selectedCustomerIndex]);
                hideCustomerDropdown();
            }
        } else if (e.key === 'Escape') {
            hideCustomerDropdown();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.position-relative')) {
            hideCustomerDropdown();
        }
    });

    // Clear customer button
    const clearCustomerBtn = document.getElementById('clearCustomerBtn');
    if (clearCustomerBtn) {
        clearCustomerBtn.addEventListener('click', () => {
            resetToDefaultCustomer();
            searchInput.focus();
        });
    }
}

function resetToDefaultCustomer() {
    selectedCustomer = null;
    const customerIdInput = document.getElementById('customerId');
    const customerSearchInput = document.getElementById('customerSearchInput');
    const clearCustomerBtn = document.getElementById('clearCustomerBtn');

    if (customerIdInput) customerIdInput.value = '';
    if (customerSearchInput) customerSearchInput.value = 'Walk-in Customer';
    if (clearCustomerBtn) clearCustomerBtn.style.display = 'none';

    hideCustomerDropdown();
}

function getCustomerDisplayText(customer) {
    return `${customer.name}${customer.phone ? ` - ${customer.phone}` : ''}`;
}

async function performCustomerSearch(keyword) {
    try {
        const response = await fetch(`/pos/api/customers/search?q=${encodeURIComponent(keyword)}`);
        const data = await response.json();

        if (data.customers && data.customers.length > 0) {
            currentCustomerResults = data.customers;
            selectedCustomerIndex = -1;
            renderCustomerDropdown(currentCustomerResults);
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

    if (!customers || customers.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                <small>Tidak ada customer ditemukan</small>
            </div>
        `;
        return;
    }

    let html = '';
    customers.forEach((customer, index) => {
        const isMember = customer.type === 'member';
        html += `
            <div class="customer-dropdown-item" data-index="${index}" data-id="${customer.id}">
                <div class="customer-dropdown-item-info">
                    <div class="customer-dropdown-item-name">
                        ${escapeHtml(customer.name)}
                        ${customer.memberDiscount > 0 ? `<span class="badge bg-success ms-1">Diskon ${customer.memberDiscount}%</span>` : ''}
                    </div>
                    <div class="customer-dropdown-item-phone">
                        ${customer.phone || '-'}
                    </div>
                </div>
                <div class="customer-dropdown-item-type ${isMember ? 'member' : ''}">
                    ${isMember ? 'Member' : 'Umum'}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    // Add click events
    document.querySelectorAll('.customer-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const customer = currentCustomerResults.find(c => c.id === id);
            if (customer) {
                selectCustomer(customer);
                const searchInput = document.getElementById('customerSearchInput');
                if (searchInput) searchInput.value = getCustomerDisplayText(customer);
                hideCustomerDropdown();
            }
        });

        item.addEventListener('mouseenter', () => {
            const index = parseInt(item.dataset.index);
            setSelectedCustomerIndex(index);
        });
    });
}

function selectCustomer(customer) {
    selectedCustomer = customer;
    const customerIdInput = document.getElementById('customerId');
    const customerSearchInput = document.getElementById('customerSearchInput');
    const clearCustomerBtn = document.getElementById('clearCustomerBtn');

    if (customerIdInput) customerIdInput.value = customer.id;
    if (customerSearchInput) {
        customerSearchInput.value = getCustomerDisplayText(customer);
    }
    if (clearCustomerBtn) clearCustomerBtn.style.display = 'inline-flex';

    console.log('Customer selected:', customer.name);
}

function selectNextCustomerResult() {
    if (currentCustomerResults.length === 0) return;
    selectedCustomerIndex = (selectedCustomerIndex + 1) % currentCustomerResults.length;
    updateSelectedCustomerItem();
}

function selectPreviousCustomerResult() {
    if (currentCustomerResults.length === 0) return;
    selectedCustomerIndex = (selectedCustomerIndex - 1 + currentCustomerResults.length) % currentCustomerResults.length;
    updateSelectedCustomerItem();
}

function setSelectedCustomerIndex(index) {
    selectedCustomerIndex = index;
    updateSelectedCustomerItem();
}

function updateSelectedCustomerItem() {
    document.querySelectorAll('.customer-dropdown-item').forEach((item, i) => {
        if (i === selectedCustomerIndex) {
            item.classList.add('selected');
            item.scrollIntoView({
                block: 'nearest'
            });
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
    currentCustomerResults = [];
    selectedCustomerIndex = -1;
}

//  ============================= Cart =========================

function addToCartFromSearch(product) {
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
        type: product.type || 'fisik',
        service: product.service || false,
        isService: product.service === true,
        isPPOB: product.type === 'ppob'
    };
    
    showPriceConfirmModal(cartProduct);
}

function selectNextResult() {
    if (currentSearchResults.length === 0) return;
    selectedSearchIndex = (selectedSearchIndex + 1) % currentSearchResults.length;
    updateSelectedItem();
}

function selectPreviousResult() {
    if (currentSearchResults.length === 0) return;
    selectedSearchIndex = (selectedSearchIndex - 1 + currentSearchResults.length) % currentSearchResults.length;
    updateSelectedItem();
}

function setSelectedIndex(index) {
    selectedSearchIndex = index;
    updateSelectedItem();
}

function updateSelectedItem() {
    document.querySelectorAll('.search-dropdown-item').forEach((item, i) => {
        if (i === selectedSearchIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function showSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) dropdown.style.display = 'block';
}

function hideSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    if (dropdown) dropdown.style.display = 'none';
    currentSearchResults = [];
    selectedSearchIndex = -1;
}

// ==================== MODAL KONFIRMASI HARGA SEBELUM CART ====================

let pendingProduct = null; // Menyimpan produk yang akan ditambahkan

// Initialize modal konfirmasi harga
function initializePriceConfirmModal() {
    if (document.getElementById('priceConfirmModal')) return;

    const modalHtml = `
        <div class="modal modal-top fade"
             id="priceConfirmModal"
             tabindex="-1"
             aria-hidden="true"
             data-bs-backdrop="static">

            <div class="modal-dialog">

                <form id="formPriceConfirm"
                      class="modal-content">

                    <!-- Header -->
                    <div class="modal-header">
                        <h5 class="modal-title d-flex align-items-center">
                            <i class="bx bx-dollar-circle text-primary me-2"></i>
                            Konfirmasi Harga
                        </h5>

                        <button type="button"
                                class="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close">
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="modal-body">

                        <!-- Produk -->
                        <div class="mb-3">
                            <label for="confirmProductName"
                                   class="form-label">
                                Produk
                            </label>

                            <input type="text"
                                   id="confirmProductName"
                                   class="form-control"
                                   readonly>
                        </div>

                        <!-- Harga -->
                        <div class="mb-3">
                            <label for="confirmProductPrice"
                                   class="form-label">
                                Harga Satuan
                            </label>

                            <div class="input-group input-group-merge">
                                <span class="input-group-text">
                                    Rp
                                </span>

                                <input type="number"
                                       id="confirmProductPrice"
                                       class="form-control"
                                       step="100"
                                       min="0"
                                       inputmode="numeric"
                                       autocomplete="off">
                            </div>

                            <div class="form-text">
                                Tekan Enter untuk langsung tambah ke cart
                            </div>
                        </div>

                        <!-- Stock -->
                        <div id="confirmStockInfo" class="d-none">
                            <div class="alert alert-label-secondary mb-0 py-2">
                                <small class="d-flex align-items-center">
                                    <i class="bx bx-package me-1"></i>
                                    Stok tersedia:
                                    <span id="confirmStock"
                                          class="fw-semibold ms-1"></span>
                                </small>
                            </div>
                        </div>

                    </div>

                    <!-- Footer -->
                    <div class="modal-footer">

                        <button type="button"
                                class="btn btn-label-secondary"
                                data-bs-dismiss="modal">
                            Batal
                        </button>

                        <button type="submit"
                                class="btn btn-primary">
                            <i class="bx bx-cart-add me-1"></i>
                            Tambah
                        </button>

                    </div>

                </form>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const form = document.getElementById('formPriceConfirm');
    const modalElement = document.getElementById('priceConfirmModal');

    // Submit
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        confirmAddToCart();
    });

    // Focus input
    modalElement?.addEventListener('shown.bs.modal', () => {
        const priceInput = document.getElementById('confirmProductPrice');

        if (priceInput) {
            priceInput.focus();
            priceInput.select();
        }
    });

    // Return focus
    modalElement?.addEventListener('hidden.bs.modal', () => {
        if (elements.searchProduct) {
            elements.searchProduct.focus();
            elements.searchProduct.select();
        }
    });
}

// Tampilkan modal konfirmasi harga
function showPriceConfirmModal(product) {
    // Jika harga tidak bisa diubah, langsung tambah ke cart dan fokus ke search
    if (!product.priceChangeAllowed) {
        addToCart(product);
        // Fokus ke search setelah menambah produk
        setTimeout(() => {
            if (elements.searchProduct) {
                elements.searchProduct.focus();
                elements.searchProduct.select();
            }
        }, 50);
        return;
    }

    pendingProduct = {
        ...product
    };

    // Isi data ke modal
    document.getElementById('confirmProductName').value = product.name;
    document.getElementById('confirmProductPrice').value = product.price;

    // Tampilkan info stok jika produk fisik
    const stockInfo = document.getElementById('confirmStockInfo');
    const stockSpan = document.getElementById('confirmStock');
    if (!product.isService && !product.isPPOB && product.type !== 'ppob') {
        stockInfo.classList.remove('d-none');
        stockSpan.textContent = product.stock;
    } else {
        stockInfo.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('priceConfirmModal'));
    modal.show();
}

// Konfirmasi tambah ke cart
function confirmAddToCart() {
    if (!pendingProduct) return;

    const newPrice = parseFloat(document.getElementById('confirmProductPrice').value);

    if (isNaN(newPrice) || newPrice <= 0) {
        showError('Harga Tidak Valid', 'Masukkan harga yang valid');
        // Tetap fokus ke input harga
        const priceInput = document.getElementById('confirmProductPrice');
        if (priceInput) {
            priceInput.focus();
            priceInput.select();
        }
        return;
    }

    // Update harga produk
    pendingProduct.price = newPrice;
    pendingProduct.originalPrice = newPrice;

    // Tambahkan ke cart
    addToCart(pendingProduct);

    // Tutup modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('priceConfirmModal'));
    if (modal) modal.hide();

    // Reset pending product
    pendingProduct = null;

    setTimeout(() => {
        if (elements.searchProduct) {
            elements.searchProduct.focus();
            elements.searchProduct.select();
        }
    }, 150);
}

// ==================== CART MANAGEMENT ====================

function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    const noStockLimit = product.isService || product.isPPOB || product.service === true;

    if (existing) {
        if (!noStockLimit && existing.qty >= existing.stock) {
            showError('Stock Habis', `Stok ${product.name} tidak mencukupi`);
            return false;
        }
        existing.qty++;
        renderCart();
    } else {
        cart.push({
            ...product,
            qty: 1,
            noStockLimit: noStockLimit
        });
        renderCart();
    }

    return true;
}

function handleAddToCart(button) {
    const card = button.closest('.pos-product-card');
    if (!card) return;

    const isService = card.dataset.service === 'true';
    const isPPOB = card.dataset.type === 'ppob';
    const productTax = parseFloat(card.dataset.tax) || 0;
    const enableTax = card.dataset.enableInputTax === 'true';
    const enableAltDesc = card.dataset.enableAltDesc === 'true';
    const priceChangeAllowed = card.dataset.priceChangeAllowed === 'true';

    const product = {
        id: parseInt(card.dataset.id),
        name: card.dataset.name,
        price: parseFloat(card.dataset.price),
        originalPrice: parseFloat(card.dataset.price),
        stock: parseInt(card.dataset.stock),
        code: card.dataset.code || '',
        tax: enableTax ? productTax : 0,
        enableTax: enableTax,
        enableAltDesc: enableAltDesc,
        altDesc: '',
        type: card.dataset.type || 'fisik',
        service: isService,
        isService: isService,
        isPPOB: isPPOB,
        priceChangeAllowed: priceChangeAllowed
    };

    showPriceConfirmModal(product);
}

function showEditPriceModal(button) {
    const productId = parseInt(button.dataset.id);
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    
    if (!item.priceChangeAllowed) {
        showError('Harga Tetap', 'Harga produk ini tidak dapat diubah');
        return;
    }
    
    document.getElementById('editPriceProductId').value = item.id;
    document.getElementById('editPriceProductName').textContent = item.name;
    document.getElementById('editPriceNewPrice').value = item.price;
    
    const modal = new bootstrap.Modal(document.getElementById('editPriceModal'));
    modal.show();

    setTimeout(() => {
        const priceInput = document.getElementById('editPriceNewPrice');
        if (priceInput) {
            priceInput.focus();
            priceInput.select();
        }
    }, 500);
}

function saveEditedPrice() {
    const productId = parseInt(document.getElementById('editPriceProductId').value);
    const newPrice = parseFloat(document.getElementById('editPriceNewPrice').value);
    const item = cart.find(i => i.id === productId);
    
    if (!item) return;
    
    if (isNaN(newPrice) || newPrice <= 0) {
        showError('Harga Tidak Valid', 'Masukkan harga yang valid');
        return;
    }
    
    item.price = newPrice;
    renderCart();
    
    bootstrap.Modal.getInstance(document.getElementById('editPriceModal')).hide();
}

function showEditDescModal(button) {
    const productId = parseInt(button.dataset.id);
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    if (!item.enableAltDesc) {
        showError('Tidak Tersedia', 'Deskripsi alternatif tidak tersedia untuk produk ini');
        return;
    }

    document.getElementById('editDescProductId').value = item.id;
    document.getElementById('editDescProductName').textContent = item.name;
    document.getElementById('editDescText').value = item.altDesc || '';

    const modal = new bootstrap.Modal(document.getElementById('editDescModal'));
    modal.show();

    setTimeout(() => {
        const descTextarea = document.getElementById('editDescText');
        if (descTextarea) {
            descTextarea.focus();
        }
    }, 500);
}

function saveEditedDescription() {
    const productId = parseInt(document.getElementById('editDescProductId')?.value);
    if (!productId) return;
    
    const newDesc = document.getElementById('editDescText')?.value.trim() || '';
    const item = cart.find(i => i.id === productId);
    
    if (!item) return;
    
    item.altDesc = newDesc;
    renderCart();
    
    const modalElement = document.getElementById('editDescModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();   
}

function handleQuantityChange(button, delta) {
    const productId = parseInt(button.dataset.id);
    updateQuantity(productId, delta);
}

function updateQuantity(productId, delta) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex === -1) return;
    
    const item = cart[itemIndex];
    const newQty = item.qty + delta;
    const noStockLimit = item.noStockLimit || item.isService || item.isPPOB;
    
    if (newQty <= 0) {
        removeFromCart(productId);
    } else if (noStockLimit || newQty <= item.stock) {
        item.qty = newQty;
        renderCart();
    } else {
        showError('Stock Habis', `Stok ${item.name} hanya ${item.stock}`);
    }
}

function handleRemoveFromCart(button) {
    const productId = parseInt(button.dataset.id);
    removeFromCart(productId);
}

function removeFromCart(productId) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        cart = cart.filter(item => item.id !== productId);
        renderCart();
    }
}

function handleClearCart() {
    if (cart.length === 0) {
        showError('Cart Kosong', 'Tidak ada item dalam cart');
        return;
    }
    
    if (confirm('Yakin ingin mengosongkan seluruh cart?')) {
        cart = [];
        renderCart();
    }
}

function renderCart() {
    if (!elements.cartItems) return;
    
    if (cart.length === 0) {
        elements.cartItems.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bx bx-cart-alt bx-lg mb-2"></i>
                <p class="mb-0">Cart is empty</p>
                <small>Click "Add to Cart" to start</small>
            </div>
        `;
        calculateAndRenderTotals();
        return;
    }
    
    let html = '';
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        const itemTax = item.tax || 0;
        const itemTaxAmount = itemTotal * (itemTax / 100);
        const isService = item.isService || item.service === true;
        const isPPOB = item.isPPOB || item.type === 'ppob';
        
        html += `
            <div class="cart-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
                            <h6 class="mb-0">
                                ${escapeHtml(item.name)}
                                ${isService ? '<span class="badge bg-warning ms-1">Service</span>' : ''}
                                ${isPPOB ? '<span class="badge bg-info ms-1">PPOB</span>' : ''}
                            </h6>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-secondary btn-qty-minus" data-id="${item.id}">
                                    <i class="bx bx-minus"></i>
                                </button>
                                <span class="px-2 py-1 bg-white border rounded">${item.qty}</span>
                                <button class="btn btn-outline-secondary btn-qty-plus" data-id="${item.id}" ${!isService && !isPPOB && item.qty >= item.stock ? 'disabled' : ''}>
                                    <i class="bx bx-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="d-flex flex-wrap gap-2 mb-1">
                            <small class="text-muted">${formatRupiah(item.price)} x ${item.qty}</small>
                            ${item.code ? `<small class="text-muted">| Code: ${item.code}</small>` : ''}
                            ${item.tax > 0 ? `<small class="text-muted">| Tax: ${item.tax}%</small>` : ''}
                        </div>
                        ${item.altDesc ? `<small class="text-success d-block mb-1"><i class="bx bx-note"></i> ${escapeHtml(item.altDesc)}</small>` : ''}
                        <div class="d-flex gap-2 mt-2 flex-wrap">
                            ${item.priceChangeAllowed ? `
                                <button class="btn btn-xs btn-outline-primary btn-edit-price" data-id="${item.id}">
                                    <i class="bx bx-edit"></i> Edit Harga
                                </button>
                            ` : ''}
                            ${item.enableAltDesc ? `
                                <button class="btn btn-xs btn-outline-secondary btn-edit-desc" data-id="${item.id}">
                                    <i class="bx bx-note"></i> Tambah Deskripsi
                                </button>
                            ` : ''}
                            <button class="btn btn-xs btn-outline-danger btn-remove" data-id="${item.id}">
                                <i class="bx bx-trash"></i> Hapus
                            </button>
                        </div>
                    </div>
                    <div class="text-end ms-3">
                        <div class="fw-bold text-primary">${formatRupiah(itemTotal)}</div>
                        ${item.tax > 0 ? `<small class="text-muted">Tax: ${formatRupiah(itemTaxAmount)}</small>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    elements.cartItems.innerHTML = html;
    calculateAndRenderTotals();
}

// ==================== CALCULATIONS ====================

function calculateAndRenderTotals() {
    const { subtotal, taxAmount, discount, total } = calculateTotals();
    
    if (elements.subtotal) elements.subtotal.textContent = formatRupiah(subtotal);
    if (elements.taxAmount) elements.taxAmount.textContent = formatRupiah(taxAmount);
    if (elements.total) elements.total.textContent = formatRupiah(total);
    
    return { subtotal, taxAmount, discount, total };
}

function calculateTotals() {
    let subtotal = 0;
    let taxAmount = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        
        if (item.tax && item.tax > 0) {
            taxAmount += itemTotal * (item.tax / 100);
        }
    });
    
    const discount = parseFloat(elements.discountInput?.value) || 0;
    const total = Math.max(0, subtotal + taxAmount - discount);
    
    return { subtotal, taxAmount, discount, total };
}

// ==================== CATEGORY FILTER (Only for favorite products) ====================

async function handleCategoryFilter(button) {
    document.querySelectorAll('.pos-category-btn').forEach(btn => {
        btn.classList.remove('active', 'btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    button.classList.add('active', 'btn-primary');
    button.classList.remove('btn-outline-primary');

    const categoryId = button.dataset.category;
    await loadFavoriteProducts(categoryId);
}

async function loadFavoriteProducts(categoryId = 'all') {
    // Cek apakah sudah ada data produk dari EJS
    const existingProducts = document.querySelectorAll('.pos-product-card');

    // Jika kategori 'all' dan sudah ada produk dari EJS, gunakan itu
    if (categoryId === 'all' && existingProducts.length > 0) {
        // Filter berdasarkan favorite? Atau biarkan saja
        // Tapi kita tetap perlu filter favorite jika diperlukan
        const favoriteProducts = Array.from(existingProducts)
            .filter(card => card.dataset.favorite === 'true'); // Butuh tambahan data favorite di HTML

        if (favoriteProducts.length > 0) {
            // Gunakan existing DOM, jangan render ulang
            return;
        }
    }

    // Jika tidak ada, baru fetch dari API
    try {
        const params = new URLSearchParams();
        if (categoryId !== 'all') params.append('categoryId', categoryId);
        params.append('favorite', 'true');
        params.append('limit', '8');

        const response = await fetch(`/pos/api/products/favorite?${params}`);
        const data = await response.json();

        if (data.success && data.products) {
            updateProductsGrid(data.products);
        } else {
            updateProductsGrid([]);
        }
    } catch (error) {
        console.error('Error loading favorite products:', error);
        updateProductsGrid([]);
    }
}

async function refreshProductsGrid() {
    const activeCategoryBtn = document.querySelector('.pos-category-btn.active');
    const categoryId = activeCategoryBtn ? activeCategoryBtn.dataset.category : 'all';
    await loadFavoriteProducts(categoryId);
}

function updateProductsGrid(products) {
    if (!elements.productsGrid) return;

    if (!products || products.length === 0) {
        elements.productsGrid.innerHTML = `
            <div class="text-center py-5">
                <i class="bx bx-package bx-lg text-muted mb-3"></i>
                <p class="text-muted">Tidak ada produk favorit</p>
                <small class="text-muted">Gunakan pencarian untuk menemukan produk</small>
            </div>
        `;
        return;
    }

    let html = '';
    products.forEach(product => {
        const isService = product.service === true;
        const isPPOB = product.type === 'ppob';

        const enableInputTax = product.enableInputTax === true || product.enableInputTax === 1 || product.enableInputTax === 'true';
        const enableAltDesc = product.enableAltDesc === true || product.enableAltDesc === 1 || product.enableAltDesc === 'true';
        const priceChangeAllowed = product.priceChangeAllowed === true || product.priceChangeAllowed === 1 || product.priceChangeAllowed === 'true';

        html += `
            <div class="pos-product-card" 
                data-id="${product.id}"
                data-name="${escapeHtml(product.name)}"
                data-price="${product.salePrice}"
                data-stock="${product.stock || 999999}"
                data-code="${product.code || ''}"
                data-tax="${product.tax || 0}"
                data-enable-input-tax="${enableInputTax}"
                data-enable-alt-desc="${enableAltDesc}"
                data-price-change-allowed="${priceChangeAllowed}"
                data-type="${product.type || 'fisik'}"
                data-service="${product.service || false}">
                
                <img class="pos-product-image" 
                    src="${product.image || '/assets/img/elements/images.png'}" 
                    alt="${escapeHtml(product.name)}"
                    loading="lazy"
                    onerror="this.src='/assets/img/elements/images.png'">
                
                <div class="pos-product-body">
                    <div class="pos-product-title">
                        <span>${escapeHtml(product.name)}</span>
                        ${isPPOB ? '<span class="pos-badge-ppob">PPOB</span>' : ''}
                        ${isService ? '<span class="pos-badge-service">Service</span>' : ''}
                    </div>

                    ${product.code ? `<div class="pos-product-code"><i class="bx bx-barcode"></i> ${product.code}</div>` : ''}

                    ${!isService && !isPPOB ? `<div class="pos-product-stock">Stock: ${product.stock} ${product.unit || ''}</div>` : ''}

                    ${product.tax > 0 && enableInputTax ? `<div class="pos-product-stock">Tax: ${product.tax}%</div>` : ''}

                    <div class="pos-product-footer">
                        <div class="pos-product-price">${formatRupiah(product.salePrice)}</div>

                        <button class="btn btn-primary btn-sm w-100 btn-add-cart">
                            <i class="bx bx-cart-add"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    elements.productsGrid.innerHTML = html;
}

// ==================== PAYMENT MODAL (iPOS STYLE) ====================

// Handle complete order (F4) - dengan modal
async function handleCompleteOrder() {
    if (cart.length === 0) {
        showError('Cart Kosong', 'Silakan tambahkan produk terlebih dahulu');
        return;
    }
    
    const { total, subtotal, taxAmount, discount } = calculateTotals();
    
    const modalHtml = `
        <div class="modal fade" id="paymentModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    
                    <div class="modal-body p-4">
                        <!-- Total Amount Card (iPOS Style) -->
                        <div class="total-amount-card">
                            <div class="total-amount-label">TOTAL BAYAR</div>
                            <div class="total-amount-value">
                                ${formatRupiahLarge(total)}
                            </div>
                        </div>
                        
                        <!-- Payment Methods -->
                        <div class="payment-methods">
                            <div class="payment-method-btn" data-method="cash">
                                <i class="bx bx-money"></i>
                                <span>Cash</span>
                            </div>
                            <div class="payment-method-btn" data-method="card">
                                <i class="bx bx-credit-card"></i>
                                <span>Card</span>
                            </div>
                            <div class="payment-method-btn" data-method="transfer">
                                <i class="bx bx-transfer"></i>
                                <span>Transfer</span>
                            </div>
                            <div class="payment-method-btn" data-method="qris">
                                <i class="bx bx-qr"></i>
                                <span>QRIS</span>
                            </div>
                        </div>
                        
                        <!-- Amount Received (hanya untuk Cash) -->
                        <div class="amount-input-group" id="cashAmountGroup">
                            <label>JUMLAH DIBAYAR</label>
                            <div class="input-group">
                                <span class="input-group-text">Rp</span>
                                <input type="number" 
                                       class="form-control" 
                                       id="amountReceived" 
                                       placeholder="0" 
                                       min="0" 
                                       step="1000">
                            </div>
                        </div>
                        
                        <!-- Quick Payment Buttons (Cash) -->
                        <div class="quick-payment-buttons" id="quickPaymentGroup">
                            <button type="button" class="btn btn-outline-secondary" data-amount="${Math.ceil(total/1000)*1000}">
                                <i class="bx bx-up-arrow-alt"></i> Bulatkan
                            </button>
                            <button type="button" class="btn btn-outline-secondary" data-amount="${total}">
                                <i class="bx bx-check"></i> Pas (${formatRupiah(total)})
                            </button>
                            <button type="button" class="btn btn-outline-secondary" data-amount="${total + 50000}">
                                <i class="bx bx-plus"></i> +50k
                            </button>
                            <button type="button" class="btn btn-outline-secondary" data-amount="${total + 100000}">
                                <i class="bx bx-plus"></i> +100k
                            </button>
                        </div>
                        
                        <!-- Change Info -->
                        <div class="change-info" id="changeGroup">
                            <div class="change-label">KEMBALIAN</div>
                            <div class="change-value" id="changeAmount">Rp 0</div>
                        </div>
                        
                        <!-- Notes -->
                        <div class="mt-3">
                            <textarea class="form-control" id="orderNotes" rows="2" placeholder="Catatan (opsional)..."></textarea>
                        </div>
                    </div>
                    
                    <div class="modal-footer p-4 pt-0">
                        <button type="button" class="btn btn-secondary btn-cancel" data-bs-dismiss="modal">
                            <i class="bx bx-x"></i> Batal
                        </button>
                        <button type="button" class="btn btn-primary btn-pay" id="confirmPaymentBtn" disabled>
                            <i class="bx bx-check"></i> Bayar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Initialize modal elements
    const modalElement = document.getElementById('paymentModal');
    const modal = new bootstrap.Modal(modalElement);
    const amountInput = document.getElementById('amountReceived');
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const changeSpan = document.getElementById('changeAmount');
    const cashGroup = document.getElementById('cashAmountGroup');
    const quickGroup = document.getElementById('quickPaymentGroup');
    const changeGroup = document.getElementById('changeGroup');
    
    // Payment method selection
    const methodBtns = document.querySelectorAll('.payment-method-btn');
    let selectedMethod = 'cash';
    
    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMethod = btn.dataset.method;
            
            // Tampilkan/sembunyikan amount input berdasarkan method
            if (selectedMethod === 'cash') {
                cashGroup.style.display = 'block';
                quickGroup.style.display = 'flex';
                changeGroup.style.display = 'block';

                if (amountInput) {
                    amountInput.value = total;

                    // Lepas fokus dari tombol method
                    btn.blur();

                    requestAnimationFrame(() => {
                        amountInput.focus({
                            preventScroll: true
                        });
                        amountInput.select();
                    });
                }

                calculateChange();
            } else {
                cashGroup.style.display = 'none';
                quickGroup.style.display = 'none';
                changeGroup.style.display = 'none';
                confirmBtn.disabled = false;
            }
        });
    });
    
    // Set default active (Cash)
    document.querySelector('.payment-method-btn[data-method="cash"]')?.classList.add('active');
    
    // Quick payment buttons
    document.querySelectorAll('.quick-payment-buttons .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.dataset.amount);
            if (amountInput) {
                amountInput.value = amount;
                calculateChange();
                amountInput.focus();
            }
        });
    });
    
    // Calculate change function
    function calculateChange() {
        const received = parseFloat(amountInput?.value) || 0;
        const change = received - total;
        
        if (changeSpan) {
            if (change >= 0) {
                changeSpan.textContent = formatRupiah(change);
                changeSpan.classList.add('positive');
                changeSpan.classList.remove('negative');
                confirmBtn.disabled = false;
            } else {
                changeSpan.textContent = formatRupiah(Math.abs(change));
                changeSpan.classList.add('negative');
                changeSpan.classList.remove('positive');
                confirmBtn.disabled = true;
            }
        }
    }
    
    // Event listeners
    amountInput?.addEventListener('input', calculateChange);
    amountInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!confirmBtn.disabled) {
                confirmPayment(modal, total, selectedMethod);
            }
        }
    });
    
    confirmBtn?.addEventListener('click', () => confirmPayment(modal, total, selectedMethod));
    
    // Set initial value
    if (amountInput) {
        amountInput.value = total;
        calculateChange();
    }
    
    modal.show();

    modalElement.addEventListener('shown.bs.modal', () => {
    requestAnimationFrame(() => {
        amountInput?.focus({ preventScroll: true });
        amountInput?.select();
    });
}, { once: true });
}

// Cash payment langsung (F9) - tanpa modal, langsung bayar pas
async function handleCashPayment() {
    if (cart.length === 0) {
        showError('Cart Kosong', 'Silakan tambahkan produk terlebih dahulu');
        return;
    }
    
    const { subtotal, taxAmount, discount, total } = calculateTotals();
    
    // Gunakan confirm dialog sederhana
    const confirmed = confirm(`Total belanja: ${formatRupiah(total)}\nBayar dengan cash?`);
    
    if (!confirmed) return;
    
    const transactionData = {
        customerId: document.getElementById('customerId')?.value || null,
        items: cart.map(item => ({
            productId: item.id,
            quantity: item.qty,
            price: item.price,
            total: item.price * item.qty,
            tax: item.tax || 0,
            altDesc: item.altDesc || null
        })),
        subtotal: subtotal,
        tax: taxAmount,
        discount: discount,
        total: total,
        paymentMethod: 'cash',
        amountReceived: total,
        change: 0,
        notes: ''
    };
    
    await processTransaction(transactionData);
}

// Proses transaksi (digunakan oleh kedua method)
async function processTransaction(transactionData) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (csrfToken) {
        headers['CSRF-Token'] = csrfToken;
        headers['X-CSRF-Token'] = csrfToken;
    }

    try {
        const response = await fetch('/pos/api/transaction', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Tampilkan success modal (bukan Swal)
            await showSuccessModal(result.orderNumber, transactionData);

            // Reset cart setelah modal ditutup (tapi sudah di handle di modal)
            // Jangan reset di sini, karena akan di-reset saat klik "Selesai"
        } else {
            showError('Error', result.message || 'Transaksi gagal');
        }
    } catch (error) {
        console.error('Error saving transaction:', error);
        showError('Error', 'Gagal menyimpan transaksi: ' + error.message);
    }
}

// Update confirmPayment untuk menggunakan processTransaction
async function confirmPayment(modal, total, selectedMethod) {
    const { subtotal, taxAmount, discount } = calculateTotals();
    const notes = document.getElementById('orderNotes')?.value || '';
    const customerId = document.getElementById('customerId')?.value || null;
    
    let received = total;
    let change = 0;
    
    if (selectedMethod === 'cash') {
        received = parseFloat(document.getElementById('amountReceived')?.value) || 0;
        change = received - total;
        
        if (received < total) {
            showError('Pembayaran Kurang', 'Jumlah yang diterima kurang dari total');
            return;
        }
    }
    
    modal.hide();
    
    const transactionData = {
        customerId: customerId,
        items: cart.map(item => ({
            productId: item.id,
            quantity: item.qty,
            price: item.price,
            total: item.price * item.qty,
            tax: item.tax || 0,
            altDesc: item.altDesc || null
        })),
        subtotal: subtotal,
        tax: taxAmount,
        discount: discount,
        total: total,
        paymentMethod: selectedMethod,
        amountReceived: received,
        change: change,
        notes: notes
    };
    
    await processTransaction(transactionData);
}

function formatRupiahLarge(amount) {
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

// ==================== SUCCESS MODAL (iPOS STYLE) ====================

// Show success modal after payment
async function showSuccessModal(orderNumber, transactionData) {
    const { total, change, paymentMethod, amountReceived } = transactionData;
    const isCash = paymentMethod === 'cash';
    const hasChange = change > 0;
    
    // Get payment method display name
    const methodNames = {
        cash: 'Tunai',
        card: 'Kartu Debit/Kredit',
        transfer: 'Transfer Bank',
        qris: 'QRIS'
    };
    
    const methodName = methodNames[paymentMethod] || paymentMethod;
    const methodIcon = {
        cash: 'bx-money',
        card: 'bx-credit-card',
        transfer: 'bx-transfer',
        qris: 'bx-qr'
    }[paymentMethod];
    
    const modalHtml = `
        <div class="modal fade success-modal" id="successModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="success-body">
                        <!-- Success Icon -->
                        <div class="success-icon">
                            <i class="bx bx-check-circle"></i>
                        </div>
                        
                        <!-- Title -->
                        <div class="success-title">
                            PEMBAYARAN BERHASIL
                        </div>
                        <div class="success-subtitle">
                            Order #${orderNumber}
                        </div>
                        
                        ${isCash && hasChange ? `
                        <!-- Change Card (hanya untuk cash dengan kembalian) -->
                        <div class="change-card">
                            <div class="change-label">KEMBALIAN</div>
                            <div class="change-amount">
                                ${formatRupiahLarge(change)}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- Payment Details -->
                        <div class="change-card" style="background: #f8f9fa;">
                            <div class="info-row">
                                <span class="info-label">Total Belanja</span>
                                <span class="info-value">${formatRupiah(total)}</span>
                            </div>
                            ${isCash ? `
                            <div class="info-row">
                                <span class="info-label">Dibayar</span>
                                <span class="info-value">${formatRupiah(amountReceived)}</span>
                            </div>
                            ${hasChange ? `
                            <div class="info-row">
                                <span class="info-label">Kembalian</span>
                                <span class="info-value" style="color: #2ecc71;">${formatRupiah(change)}</span>
                            </div>
                            ` : ''}
                            ` : ''}
                            <div class="info-row">
                                <span class="info-label">Metode Pembayaran</span>
                                <span class="info-value">
                                    <i class="bx ${methodIcon}"></i> ${methodName}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Payment Method Badge (optional) -->
                        <div class="payment-method-badge">
                            <i class="bx ${methodIcon}"></i>
                            <span>${methodName}</span>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="success-actions">
                            <button class="btn btn-print" id="printReceiptBtn">
                                <i class="bx bx-printer"></i> Print Struk
                            </button>
                            <button class="btn btn-new-transaction" id="newTransactionBtn">
                                <i class="bx bx-check-double"></i> Selesai
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('successModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modalElement = document.getElementById('successModal');
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
    });
    
    // Print receipt button
    const printBtn = document.getElementById('printReceiptBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            printReceipt(orderNumber, transactionData);
        });
    }
    
    // New transaction button
    const newBtn = document.getElementById('newTransactionBtn');
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            modal.hide();
            
            // Reset cart
            cart = [];
            renderCart();
            if (elements.discountInput) elements.discountInput.value = '0';
            
            // Reset customer
            const customerIdInput = document.getElementById('customerId');
            const customerDisplay = document.getElementById('customerSearchInput');
            const clearCustomerBtn = document.getElementById('clearCustomerBtn');
            if (customerIdInput) customerIdInput.value = '';
            if (customerDisplay) customerDisplay.value = 'Walk-in Customer';
            if (clearCustomerBtn) clearCustomerBtn.style.display = 'none';
            
            // Refresh products grid
            refreshProductsGrid();
            
            // Focus ke search
            setTimeout(() => {
                if (elements.searchProduct) {
                    elements.searchProduct.focus();
                    elements.searchProduct.select();
                }
            }, 100);
        });
    }
    
    // Auto close after 10 seconds (optional)
    setTimeout(() => {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance && modalElement.classList.contains('show')) {
            // Don't auto close, user must click Selesai
            // But we can add a subtle reminder
        }
    }, 10000);
    
    modal.show();
}

// Print receipt function (already exists, but ensure it works)
function printReceipt(orderNumber, transactionData) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const now = new Date();
    const cashier = currentUser?.name || 'Admin';
    const customerName = document.getElementById('customerSearchInput')?.value || 'Walk-in Customer';
    
    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk #${orderNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 8px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px dashed #000;
                }
                .header h3 {
                    font-size: 14px;
                    margin-bottom: 4px;
                }
                .header p {
                    font-size: 10px;
                    color: #666;
                }
                .divider {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }
                .item {
                    margin: 4px 0;
                }
                .item-name {
                    font-weight: bold;
                }
                .item-detail {
                    display: flex;
                    justify-content: space-between;
                    margin-left: 8px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 4px 0;
                    font-weight: bold;
                }
                .footer {
                    text-align: center;
                    margin-top: 12px;
                    padding-top: 8px;
                    border-top: 1px dashed #000;
                    font-size: 10px;
                }
                .thankyou {
                    font-size: 12px;
                    font-weight: bold;
                    margin: 8px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>TOKO ANDA</h3>
                <p>Jl. Contoh No. 123, Kota<br>Telp: (021) 123-4567</p>
            </div>
            
            <div class="divider"></div>
            
            <div>Tanggal: ${now.toLocaleString()}</div>
            <div>Order #: ${orderNumber}</div>
            <div>Kasir: ${cashier}</div>
            <div>Customer: ${customerName}</div>
            
            <div class="divider"></div>
            
            <div style="font-weight: bold; margin-bottom: 8px;">Item:</div>
            ${transactionData.items.map(item => `
                <div class="item">
                    <div class="item-name">${escapeHtml(item.name)}</div>
                    <div class="item-detail">
                        <span>${formatRupiah(item.price)} x ${item.quantity}</span>
                        <span>${formatRupiah(item.total)}</span>
                    </div>
                    ${item.altDesc ? `<div style="font-size: 10px; color: #666; margin-left: 8px;">Note: ${escapeHtml(item.altDesc)}</div>` : ''}
                </div>
            `).join('')}
            
            <div class="divider"></div>
            
            <div class="total-row">
                <span>Subtotal</span>
                <span>${formatRupiah(transactionData.subtotal)}</span>
            </div>
            <div class="total-row">
                <span>Tax</span>
                <span>${formatRupiah(transactionData.tax)}</span>
            </div>
            ${transactionData.discount > 0 ? `
            <div class="total-row">
                <span>Diskon</span>
                <span>-${formatRupiah(transactionData.discount)}</span>
            </div>
            ` : ''}
            <div class="total-row" style="font-size: 14px; margin-top: 8px;">
                <span>TOTAL</span>
                <span>${formatRupiah(transactionData.total)}</span>
            </div>
            
            ${transactionData.paymentMethod === 'cash' ? `
            <div class="total-row">
                <span>Dibayar</span>
                <span>${formatRupiah(transactionData.amountReceived)}</span>
            </div>
            ${transactionData.change > 0 ? `
            <div class="total-row">
                <span>Kembalian</span>
                <span>${formatRupiah(transactionData.change)}</span>
            </div>
            ` : ''}
            ` : ''}
            
            <div class="total-row">
                <span>Metode</span>
                <span>${transactionData.paymentMethod.toUpperCase()}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="footer">
                <div class="thankyou">TERIMA KASIH</div>
                <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
                <p>www.tokoanda.com</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    
    // Optional: close after print
    printWindow.onafterprint = () => {
        printWindow.close();
    };
}

// ==================== KEYBOARD SHORTCUTS ====================

function handleKeyboardShortcuts(e) {
    if (e.key === 'F1') {
        e.preventDefault();
        elements.searchProduct?.focus();
    }
    if (e.key === 'F2' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        const customerInput = document.getElementById('customerSearchInput');
        if (customerInput) {
            customerInput.focus();
            customerInput.select();
        }
    }
    if (e.key === 'F3') {
        e.preventDefault();
        handleClearCart();
    }
    if (e.key === 'F4') {
        e.preventDefault();
        handleCompleteOrder();
    }
    if (e.key === 'F9') {
        e.preventDefault();
        handleCashPayment();
    }
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        elements.discountInput?.focus();
    }
    if (e.key === 'Escape') {
        if (elements.searchProduct && document.activeElement === elements.searchProduct) {
            elements.searchProduct.value = '';
            hideSearchDropdown();
        }
    }
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

function showNotification(title, message, type = 'info', duration = 2000) {
    const allowedTypes = ['error', 'warning'];

    if (!allowedTypes.includes(type)) return;

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title,
            text: message,
            icon: type,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: duration
        });
    }
}

function showError(title, message) {
    const toastHtml = `
        <div id="errorToast" class="position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999;">
            <div class="toast align-items-center text-white bg-danger border-0" role="alert" data-bs-autohide="true" data-bs-delay="3000">
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${escapeHtml(title)}</strong><br>${escapeHtml(message)}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `;
    
    const existingToast = document.getElementById('errorToast');
    if (existingToast) existingToast.remove();
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastEl = document.querySelector('#errorToast .toast');
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 3000 });
    toast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => {
        const toastContainer = document.getElementById('errorToast');
        if (toastContainer) toastContainer.remove();
    });
}

// Load favorite products on start
// loadFavoriteProducts();