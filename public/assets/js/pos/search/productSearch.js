// Search/ProductSearch
import {
    DOM
} from '../core/dom.js';
import {
    addToCart
} from '../cart/cartManager.js';
import {
    escapeHtml
} from '../utils/escapeHtml.js';
import {
    showWarning
} from '../ui/notifications.js';

// Sample products (nanti dari API)
let products = [];

export function initProductSearch() {
    loadSampleProducts();

    // Desktop search
    if (DOM.searchProduct) {
        DOM.searchProduct.addEventListener('input', debounce((e) => {
            searchProducts(e.target.value);
        }, 300));

        DOM.searchProduct.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstItem = document.querySelector('.search-dropdown-item');
                if (firstItem) firstItem.click();
            } else if (e.key === 'Escape') {
                closeSearchDropdown();
            }
        });
    }

    // Mobile search
    if (DOM.mobileSearchProduct) {
        DOM.mobileSearchProduct.addEventListener('input', debounce((e) => {
            searchProductsMobile(e.target.value);
        }, 300));
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const searchGroup = document.querySelector('.pos-search-group');
        if (searchGroup && !searchGroup.contains(e.target)) {
            closeSearchDropdown();
        }
    });
}

function loadSampleProducts() {
    products = [{
            id: 1,
            name: 'Indomie Goreng',
            barcode: '8997008100015',
            price: 3500,
            stock: 50
        },
        {
            id: 2,
            name: 'Aqua 600ml',
            barcode: '8992759100017',
            price: 3000,
            stock: 100
        },
        {
            id: 3,
            name: 'Teh Pucuk 350ml',
            barcode: '8996022300021',
            price: 4000,
            stock: 75
        },
        {
            id: 4,
            name: 'Roti Tawar Sari Roti',
            barcode: '8998888100111',
            price: 12000,
            stock: 30
        },
        {
            id: 5,
            name: 'Kopi Kapal Api 65g',
            barcode: '8991002100656',
            price: 6500,
            stock: 45
        }
    ];
}

function searchProducts(query) {
    if (!DOM.searchResultsList) return;

    if (!query || query.trim() === '') {
        closeSearchDropdown();
        return;
    }

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query)
    );

    if (filtered.length === 0) {
        DOM.searchResultsList.innerHTML = `
            <div class="search-dropdown-empty">
                <i class="bx bx-package"></i>
                <div>Produk tidak ditemukan</div>
            </div>
        `;
    } else {
        DOM.searchResultsList.innerHTML = filtered.map(product => `
            <div class="search-dropdown-item" data-product-id="${product.id}">
                <div class="search-dropdown-info">
                    <div class="search-dropdown-name">
                        <span class="item-name">${escapeHtml(product.name)}</span>
                        <span class="item-code">${product.barcode}</span>
                    </div>
                    <div class="search-dropdown-meta">
                        <span class="item-price">Rp ${product.price.toLocaleString()}</span>
                        <span class="item-stock">Stok: ${product.stock}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    if (DOM.searchDropdown) DOM.searchDropdown.style.display = 'block';

    // Add click handlers
    DOM.searchResultsList.querySelectorAll('.search-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.productId);
            const product = products.find(p => p.id === id);
            if (product) {
                addToCart(product);
                if (DOM.searchProduct) DOM.searchProduct.value = '';
                closeSearchDropdown();
            }
        });
    });
}

function searchProductsMobile(query) {
    // Similar to desktop but for mobile
    if (!query || query.trim() === '') return;

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query)
    );

    if (filtered.length === 1 && query.trim().length > 3) {
        // Auto-add if barcode scan
        addToCart(filtered[0]);
        if (DOM.mobileSearchProduct) DOM.mobileSearchProduct.value = '';
    }
}

function closeSearchDropdown() {
    if (DOM.searchDropdown) DOM.searchDropdown.style.display = 'none';
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}