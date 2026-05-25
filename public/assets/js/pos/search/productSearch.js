// Search/ProductSearch - Menggunakan SearchDropdown component
import { DOM } from '../core/dom.js';
import { addToCart } from '../cart/cartManager.js';
import { formatRupiah } from '../utils/currency.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { showError } from '../ui/notifications.js';
import SearchDropdown from './searchDropdown.js';

let productDropdown = null;
let mobileProductDropdown = null;

export function initProductSearch() {
    const dropdownOptions = {
        minChars: 1,
        maxResults: 10,
        placeholder: 'Scan barcode atau cari produk... (F1)',
        onSearch: searchProductsAPI,
        renderItem: renderProductSearchItem,
        onSelect: handleProductSelect
    };

    // Inisialisasi dropdown untuk desktop
    if (DOM.searchProduct && DOM.searchDropdown && DOM.searchResultsList) {
        productDropdown = new SearchDropdown({
            ...dropdownOptions,
            inputElement: DOM.searchProduct,
            dropdownElement: DOM.searchDropdown,
            resultsListElement: DOM.searchResultsList
        });
    }
    
    // Inisialisasi dropdown untuk mobile
    if (DOM.mobileSearchProduct && DOM.mobileSearchDropdown && DOM.mobileSearchResultsList) {
        mobileProductDropdown = new SearchDropdown({
            ...dropdownOptions,
            inputElement: DOM.mobileSearchProduct,
            dropdownElement: DOM.mobileSearchDropdown,
            resultsListElement: DOM.mobileSearchResultsList,
            placeholder: 'Scan barcode atau cari produk...',
            openDisplay: 'flex'
        });
    }

    bindBarcodeEnter(DOM.searchProduct);
    bindBarcodeEnter(DOM.mobileSearchProduct);
    
    // Barcode scanner global (tanpa input focus)
    initBarcodeScanner();
    
    // Keyboard shortcut F1
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
            e.preventDefault();
            DOM.searchProduct?.focus();
            DOM.searchProduct?.select();
        }
    });
}

function renderProductSearchItem(item, index) {
    const product = item.originalData;
    const isService = product.type === 'service';
    const isPPOB = product.type === 'ppob';
    const stock = product.type === 'fisik' ? (product.stock ?? 0) : '∞';
    const stockClass = product.type !== 'fisik'
        ? 'high-stock'
        : ((product.stock ?? 0) <= 0 ? 'low-stock' : ((product.stock ?? 0) < 10 ? 'medium-stock' : 'high-stock'));

    return `
        <div class="search-dropdown-item" data-index="${index}" data-id="${product.id}" data-value="${product.id}">
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
                        Stok: <span class="stock-value ${stockClass}">${stock}</span>
                    </span>
                </div>
            </div>
        </div>
    `;
}

function handleProductSelect(item) {
    if (item?.originalData) {
        addProductToCart(item.originalData);
    }
}

function bindBarcodeEnter(input) {
    input?.addEventListener('keydown', async (e) => {
        if (e.defaultPrevented) return;
        if (e.key !== 'Enter') return;

        const query = input.value.trim();
        if (/^\d+$/.test(query) && query.length >= 8) {
            e.preventDefault();
            await handleBarcodeScan(query);
        }
    });
}

/**
 * Search API call - mengembalikan format yang sesuai untuk dropdown
 */
async function searchProductsAPI(query) {
    if (!query || query.trim().length < 1) {
        return [];
    }
    
    try {
        const response = await fetch(`/pos/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.products) {
            // Format untuk dropdown
            return data.products.map(product => {
                const isService = product.type === 'service';
                const isPPOB = product.type === 'ppob';
                const stockClass = product.stock <= 0 ? 'low-stock' : (product.stock < 10 ? 'medium-stock' : 'high-stock');
                
                // Buat subtitle dengan HTML untuk ditampilkan di dropdown
                let subtitle = `${product.code || product.barcode || '-'} | Stok: ${product.stock ?? '∞'}`;
                if (isPPOB) subtitle = 'PPOB - ' + subtitle;
                if (isService) subtitle = 'Layanan - ' + subtitle;
                
                return {
                    id: product.id,
                    value: product.id,
                    label: product.name,
                    name: product.name,
                    subtitle: subtitle,
                    icon: isPPOB ? 'bx-qr' : (isService ? 'bx-wrench' : 'bx-package'),
                    originalData: product,  // Simpan data asli
                    // Untuk render custom
                    stock: product.stock,
                    stockClass: stockClass,
                    price: product.salePrice,
                    code: product.code,
                    barcode: product.barcode,
                    isService: isService,
                    isPPOB: isPPOB
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Search API error:', error);
        return [];
    }
}

/**
 * Add product to cart dengan format yang benar
 */
function addProductToCart(product) {
    // Konversi boolean dari berbagai format (true/1/'true')
    const toBoolean = (value) => {
        if (typeof value === 'boolean') return value;
        if (value === 1 || value === '1' || value === 'true') return true;
        return false;
    };
    
    const cartProduct = {
        id: product.id,
        name: product.name,
        price: product.salePrice || product.price,
        originalPrice: product.salePrice || product.price,
        stock: product.stock ?? 0,
        code: product.code || product.barcode || '',
        barcode: product.barcode || '',
        tax: product.tax || 0,
        enableTax: toBoolean(product.enableInputTax),
        enableAltDesc: toBoolean(product.enableAltDesc),
        priceChangeAllowed: toBoolean(product.priceChangeAllowed),
        requireQtyInput: toBoolean(product.requireQtyInput),
        defaultQty: toBoolean(product.defaultQty),
        type: product.type || 'product',
        isService: product.type === 'service',
        isPPOB: product.type === 'ppob',
        altDesc: '',
        discount: 0,
        quantity: 1,
        qty: 1,
        cartId: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random()
    };
    
    addToCart(cartProduct);
    clearSearchInputs();
    closeAllProductDropdowns();
    focusSearchInput();
    
    // Tampilkan notifikasi sukses
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Ditambahkan',
            text: `${product.name} ditambahkan ke keranjang`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1000
        });
    }
}

/**
 * Handle barcode scan dari input atau scanner fisik
 */
async function handleBarcodeScan(barcode) {
    try {
        const response = await fetch(`/pos/product/${encodeURIComponent(barcode)}`);
        const data = await response.json();
        
        if (data.success && data.product) {
            addProductToCart(data.product);
            clearSearchInputs();
            closeAllProductDropdowns();
        } else {
            showError('Not Found', `Produk dengan barcode ${barcode} tidak ditemukan`);
        }
    } catch (error) {
        console.error('Barcode error:', error);
        showError('Error', 'Gagal memindai barcode');
    }
}

/**
 * Inisialisasi barcode scanner dari keyboard (tanpa input focus)
 */
function initBarcodeScanner() {
    let barcodeBuffer = '';
    let lastKeyTime = 0;
    const TIMEOUT_MS = 50;
    let resetTimeout = null;
    
    document.addEventListener('keydown', (e) => {
        // Skip if input is focused (biarkan input normal)
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }
        
        const now = Date.now();
        const timeDiff = now - lastKeyTime;
        
        // Reset buffer if too slow
        if (timeDiff > TIMEOUT_MS && barcodeBuffer.length > 0) {
            barcodeBuffer = '';
        }
        
        lastKeyTime = now;
        
        if (e.key === 'Enter') {
            if (barcodeBuffer.length > 0) {
                e.preventDefault();
                handleBarcodeScan(barcodeBuffer);
                barcodeBuffer = '';
                if (resetTimeout) clearTimeout(resetTimeout);
            }
            return;
        }
        
        // Only process printable characters
        if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
            e.preventDefault();
            barcodeBuffer += e.key;
            
            if (resetTimeout) clearTimeout(resetTimeout);
            resetTimeout = setTimeout(() => {
                barcodeBuffer = '';
            }, TIMEOUT_MS * 2);
        }
    });
}

/**
 * Refresh search dropdown (misal setelah data berubah)
 */
export function refreshProductSearch() {
    if (productDropdown && DOM.searchProduct && DOM.searchProduct.value.length >= 1) {
        productDropdown.refresh();
    }
    if (mobileProductDropdown && DOM.mobileSearchProduct && DOM.mobileSearchProduct.value.length >= 1) {
        mobileProductDropdown.refresh();
    }
}

/**
 * Close search dropdown
 */
export function closeProductSearch() {
    closeAllProductDropdowns();
}

function clearSearchInputs() {
    if (DOM.searchProduct) DOM.searchProduct.value = '';
    if (DOM.mobileSearchProduct) DOM.mobileSearchProduct.value = '';
}

function closeAllProductDropdowns() {
    productDropdown?.close();
    mobileProductDropdown?.close();
}

function focusSearchInput() {
    setTimeout(() => {
        if (window.innerWidth <= 767 && DOM.mobileSearchProduct) {
            DOM.mobileSearchProduct.focus();
        } else {
            DOM.searchProduct?.focus();
        }
    }, 100);
}
