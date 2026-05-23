// /public/assets/js/product/productTableHandler.js

import { showToast } from '../utils/toast.js';
import { confirmDelete } from '../utils/confirm.js';

let currentSearch = '';
let offset = 0;
const limit = 25;
let loading = false;
let done = false;

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

export function resetTableState() {
    offset = 0;
    done = false;
    loading = false;
    currentSearch = document.getElementById('searchProduct')?.value?.trim() || '';
}

export function getCurrentSearch() {
    return currentSearch;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTypeBadge(type) {
    if (type === 'service') {
        return '<span class="badge badge-xs bg-warning text-warning-emphasis border border-warning ms-1">SVC</span>';
    }
    if (type === 'ppob') {
        return '<span class="badge badge-xs bg-info text-info-emphasis border border-info ms-1">PPOB</span>';
    }
    return '';
}

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

export async function loadMoreProducts(tbody, scrollContainer) {
    if (loading || done) return;
    loading = true;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.textContent = 'Loading...';

    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || '';
    const supplierId = params.get('supplierId') || '';
    const type = params.get('type') || '';
    const requireQty = params.get('requireQty') || '';
    const priceChange = params.get('priceChange') || '';
    const altDesc = params.get('altDesc') || '';
    const search = currentSearch || '';

    try {
        const url = new URL('/products/json', window.location.origin);
        url.searchParams.set('offset', offset);
        url.searchParams.set('limit', limit);
        if (category) url.searchParams.set('category', category);
        if (supplierId) url.searchParams.set('supplierId', supplierId);
        if (type) url.searchParams.set('type', type);
        if (requireQty) url.searchParams.set('requireQty', requireQty);
        if (priceChange) url.searchParams.set('priceChange', priceChange);
        if (altDesc) url.searchParams.set('altDesc', altDesc);
        if (search) url.searchParams.set('q', search);

        const res = await fetch(url.toString());
        const data = await res.json();
        const { products, total } = data;

        if (offset === 0) {
            const totalCountEl = document.getElementById('totalProductCount');
            if (totalCountEl) totalCountEl.textContent = total;
        }

        if (products.length < limit) done = true;
        offset += products.length;

        const fragment = document.createDocumentFragment();
        for (const product of products) {
            const row = document.createElement('tr');
            row.dataset.id = product.id;
            row.innerHTML = `
                <td data-column="code">
                    ${escapeHtml(product.code)}
                    ${getTypeBadge(product.type)}
                </td>
                <td data-column="name">
                    <div class="fw-semibold">${escapeHtml(product.name)}</div>
                </td>
                <td data-column="category">${escapeHtml(product.category?.name || '-')}</td>
                <td data-column="barcode">${escapeHtml(product.barcode || '-')}</td>
                <td data-column="cost" data-value="${product.cost}">${formatRupiah(product.cost)}</td>
                <td data-column="salePrice" data-value="${product.salePrice}">${formatRupiah(product.salePrice)}</td>
                <td data-column="unit">${escapeHtml(product.unit || '-')}</td>
                <td data-column="supplier">${escapeHtml(product.supplier?.name || '-')}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-icon btn-warning btn-edit" data-bs-toggle="modal" data-bs-target="#modalEdit">
                        <i class="bx bx-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger btn-delete">
                        <i class="bx bx-trash"></i>
                    </button>
                </td>
            `;
            fragment.appendChild(row);
        }
        tbody.appendChild(fragment);

        if (loadingIndicator) {
            loadingIndicator.textContent = done ? 'Semua Product dimuat' : '';
        }
    } catch (err) {
        console.error('Error in loadMoreProducts:', err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data: ' + err.message
        });
    } finally {
        loading = false;
    }
}

export function initSearch(tbody, scrollContainer) {
    const searchInput = document.getElementById('searchProduct');
    if (!searchInput) return;

    searchInput.addEventListener('input', async (e) => {
        currentSearch = e.target.value.trim();
        resetTableState();
        tbody.innerHTML = '';
        await loadMoreProducts(tbody, scrollContainer);
    });
}

export function initInfiniteScroll(tbody, scrollContainer) {
    if (!scrollContainer) return;
    
    scrollContainer.addEventListener('scroll', () => {
        if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10) {
            loadMoreProducts(tbody, scrollContainer);
        }
    });
}

export function initFilters() {
    const filters = ['categoryFilter', 'supplierFilter', 'typeFilter', 'requireQtyFilter', 'priceChangeFilter', 'altDescFilter'];
    
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (!filter) return;
        
        filter.addEventListener('change', (e) => {
            const params = new URLSearchParams(window.location.search);
            const paramName = filterId.replace('Filter', '');
            const mappedName = {
                categoryFilter: 'category',
                supplierFilter: 'supplierId',
                typeFilter: 'type',
                requireQtyFilter: 'requireQty',
                priceChangeFilter: 'priceChange',
                altDescFilter: 'altDesc'
            }[filterId];
            
            if (e.target.value) {
                params.set(mappedName, e.target.value);
            } else {
                params.delete(mappedName);
            }
            window.location.search = params.toString();
        });
    });
}

export function initSorting(tbody) {
    const headers = document.querySelectorAll('#productTable thead th[data-sort]');
    let currentSort = { column: null, ascending: true };

    function sortTableBy(column, ascending = true) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const aCell = a.querySelector(`td[data-column="${column}"]`);
            const bCell = b.querySelector(`td[data-column="${column}"]`);
            
            let aVal = aCell?.dataset.value || aCell?.textContent?.trim() || '';
            let bVal = bCell?.dataset.value || bCell?.textContent?.trim() || '';
            
            if (column === 'cost' || column === 'salePrice') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
                return ascending ? aVal - bVal : bVal - aVal;
            }
            
            return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });
        
        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));
    }

    function updateSortIcons(column, ascending) {
        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.className = 'sort-icon bx';
        });
        
        const iconEl = document.querySelector(`th[data-sort="${column}"] .sort-icon`);
        if (iconEl) {
            iconEl.classList.add(ascending ? 'bx-sort-down' : 'bx-sort-up');
        }
    }

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            const ascending = (currentSort.column === column) ? !currentSort.ascending : true;
            currentSort = { column, ascending };
            sortTableBy(column, ascending);
            updateSortIcons(column, ascending);
        });
    });
}

export function initDelete(tbody) {
    tbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete');
        if (!btn) return;
        
        const row = btn.closest('tr');
        const productId = row.dataset.id;
        
        const confirmed = await confirmDelete('Product ini akan dihapus dan tidak bisa dikembalikan.');
        if (!confirmed) return;
        
        try {
            const res = await fetch(`/products/${productId}/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                }
            });
            const result = await res.json();
            
            if (res.ok && result.success) {
                row.remove();
                showToast({ type: 'success', title: 'Berhasil', message: result.message });
                const totalCountEl = document.getElementById('totalProductCount');
                if (totalCountEl) {
                    const currentTotal = parseInt(totalCountEl.textContent) || 0;
                    totalCountEl.textContent = currentTotal - 1;
                }
            } else {
                showToast({ type: 'danger', title: 'Gagal', message: result.message });
            }
        } catch (err) {
            showToast({ type: 'danger', title: 'Error', message: 'Gagal menghapus Product.' });
        }
    });
}

export function initExports() {
    const getFilterParams = () => {
        const search = document.getElementById('searchProduct')?.value || '';
        const category = document.querySelector('select[name="category"]')?.value || '';
        const supplierId = document.querySelector('select[name="supplierId"]')?.value || '';
        const type = document.querySelector('select[name="type"]')?.value || '';
        
        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (category) params.append('category', category);
        if (supplierId) params.append('supplierId', supplierId);
        if (type) params.append('type', type);
        return params.toString();
    };
    
    // Export CSV (dengan filter)
    const btnExportCSV = document.getElementById('btnExportCSV');
    if (btnExportCSV) {
        const newBtn = btnExportCSV.cloneNode(true);
        btnExportCSV.parentNode.replaceChild(newBtn, btnExportCSV);
        
        newBtn.addEventListener('click', () => {
            const queryString = getFilterParams();
            window.open(`/products/export/csv${queryString ? '?' + queryString : ''}`, '_blank');
        });
    }
    
    // Export PDF (TAMBAHKAN INI)
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        const newBtn = btnExportPDF.cloneNode(true);
        btnExportPDF.parentNode.replaceChild(newBtn, btnExportPDF);
        
        newBtn.addEventListener('click', () => {
            const queryString = getFilterParams();
            window.open(`/products/export/pdf${queryString ? '?' + queryString : ''}`, '_blank');
        });
    }
    
    // Print (dengan filter)
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) {
        const newBtn = btnPrint.cloneNode(true);
        btnPrint.parentNode.replaceChild(newBtn, btnPrint);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const queryString = getFilterParams();
            window.open(`/products/print${queryString ? '?' + queryString : ''}`, '_blank');
        });
    }
}

export function syncFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    const mappings = {
        type: 'typeFilter',
        requireQty: 'requireQtyFilter',
        priceChange: 'priceChangeFilter',
        altDesc: 'altDescFilter',
        category: 'categoryFilter',
        supplierId: 'supplierFilter',
        q: 'searchProduct'
    };
    
    for (const [param, elementId] of Object.entries(mappings)) {
        const value = params.get(param);
        const element = document.getElementById(elementId);
        if (element && value) {
            element.value = value;
            if (param === 'q') currentSearch = value;
        }
    }
}