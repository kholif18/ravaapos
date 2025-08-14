// --- /assets/js/pages/purchasing.js ---
import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

// --- Cache DOM ---
const purchasingWrapper = document.getElementById('purchasingWrapper');
const paginationContainer = document.getElementById('purchasingPaginationWrapper');
const formCreate = document.getElementById('formCreatePurchasing');
const formAddItem = document.getElementById('formAddItem');
const searchInput = document.getElementById('searchPurchasing');

let currentPage = 1;
let currentLimit = 10;
let currentFilter = '';

// --- API ---
const API = {
    purchasingList: '/purchasing/listJSON',
    suppliers: '/purchasing/suppliers',
    products: '/products/json',
    create: '/purchasing/create'
};

// --- Helper: Fetch JSON ---
async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Network error');
    return res.json();
}

// --- Load suppliers ---
async function loadSuppliers() {
    const supplierSelect = document.getElementById('supplierSelect'); // ambil ulang setiap kali
    if (!supplierSelect) return;

    try {
        const suppliers = await fetchJSON(API.suppliers);
        supplierSelect.innerHTML = suppliers
            .map(s => `<option value="${s.id}">${s.name}</option>`)
            .join('');
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal load suppliers'
        });
    }
}

// --- Load products ---
async function loadProducts() {
    if (!supplierSelect?.value) return;
    try {
        const res = await fetchJSON(`/products/json?supplierId=${supplierSelect.value}`);
        const select = document.getElementById('productSelect');
        if (select && res.products) {
            select.innerHTML = res.products.map(p => `<option value="${p.id}" data-price="${p.salePrice}">${p.name}</option>`).join('');
            const selected = select.selectedOptions[0];
            document.getElementById('itemPrice').value = selected?.dataset.price || 0;
        }
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal load products'
        });
    }
}

// --- Update total ---
function updateTotal() {
    const tbody = document.querySelector('#purchasingItemsTable tbody');
    if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('tr').forEach(r => {
        total += Number(r.cells[3].textContent.replace(/,/g, '')) || 0;
    });
    const totalEl = document.getElementById('purchasingTotal');
    if (totalEl) totalEl.textContent = total.toLocaleString();
}

// --- Page load ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadSuppliers();
    loadPurchasingTable(currentPage, currentLimit);

    // Event: supplier change → load products
    document.getElementById('supplierSelect')?.addEventListener('change', loadProducts);

    // Event: search filter
    searchInput?.addEventListener('input', () => {
        currentFilter = searchInput.value.trim();
        currentPage = 1;
        loadPurchasingTable(currentPage, currentLimit, currentFilter);
    });

    // Event: auto update harga
    document.getElementById('productSelect')?.addEventListener('change', function () {
        document.getElementById('itemPrice').value = this.selectedOptions[0]?.dataset.price || 0;
    });
});

// --- Load table AJAX ---
export async function loadPurchasingTable(page = 1, limit = 10, filter = '') {
    try {
        const url = `${API.purchasingList}?page=${page}&limit=${limit}&filter=${encodeURIComponent(filter)}`;
        const data = await fetchJSON(url);
        if (!data.success) throw new Error('Gagal load data');

        const tbody = purchasingWrapper.querySelector('#purchasingTbody');
        tbody.innerHTML = '';

        if (!data.purchasings.length) {
            tbody.innerHTML = `<tr>
                <td colspan="6" class="text-center text-muted py-4">Tidak ada data purchasing ditemukan.</td>
            </tr>`;
            paginationContainer.innerHTML = '';
            return;
        }

        const startNumber = (data.pagination.page - 1) * data.pagination.limit + 1;
        data.purchasings.forEach((p, i) => {
            const row = document.createElement('tr');
            row.dataset.id = p.id;
            row.innerHTML = `
                <td>${startNumber + i}</td>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${p.supplier?.name || '-'}</td>
                <td>${p.total.toLocaleString()}</td>
                <td>
                    ${p.status === 'completed' ? '<span class="badge bg-success">Completed</span>' :
                      p.status === 'draft' ? '<span class="badge bg-warning">Draft</span>' :
                      '<span class="badge bg-danger">Cancelled</span>'}
                </td>
                <td>
                    <button class="btn btn-sm btn-info btn-view" data-id="${p.id}">
                        <i class="bx bx-show"></i>
                    </button>
                    ${p.status === 'draft' ? `
                        <button class="btn btn-sm btn-success btn-complete" data-id="${p.id}">
                            <i class="bx bx-check"></i> Complete
                        </button>
                        <button class="btn btn-sm btn-danger btn-cancel" data-id="${p.id}">
                            <i class="bx bx-x"></i> Cancel
                        </button>` :
                      p.status === 'completed' ? `
                        <button class="btn btn-sm btn-warning btn-return" data-id="${p.id}">
                            <i class="bx bx-rotate-left"></i> Return
                        </button>` : ''
                    }
                </td>
            `;
            tbody.appendChild(row);
        });

        renderPagination(data.pagination);
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat purchasing'
        });
    }
}

purchasingWrapper.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    try {
        if (btn.classList.contains('btn-view')) {
            const res = await fetchJSON(`/purchasing/view/${id}`);
            if (res.success) {
                const content = document.getElementById('modalViewContent');
                content.innerHTML = `
                    <p><strong>Supplier:</strong> ${res.data.supplier?.name || '-'}</p>
                    <p><strong>Total:</strong> ${res.data.total.toLocaleString()}</p>
                    <table class="table table-bordered">
                        <thead>
                            <tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr>
                        </thead>
                        <tbody>
                            ${res.data.items.map(i => `
                                <tr>
                                    <td>${i.product?.name || '-'}</td>
                                    <td>${i.qty}</td>
                                    <td>${i.price.toLocaleString()}</td>
                                    <td>${(i.qty * i.price).toLocaleString()}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                `;
                new bootstrap.Modal(document.getElementById('modalViewPurchasing')).show();
            }
            return;
        }

        if (btn.classList.contains('btn-complete')) await fetchJSON(`/purchasing/complete/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
        });
        if (btn.classList.contains('btn-cancel')) await fetchJSON(`/purchasing/cancel/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
        });
        if (btn.classList.contains('btn-return')) {
            const qty = prompt('Masukkan jumlah yang dikembalikan:');
            if (!qty || isNaN(qty) || qty <= 0) return;
            await fetchJSON(`/purchasing/return/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    items: [{
                        productId: btn.dataset.productId,
                        qty: parseFloat(qty)
                    }]
                })
            });
        }

        showToast({
            type: 'success',
            title: 'Sukses',
            message: 'Aksi berhasil diproses'
        });
        loadPurchasingTable(currentPage, currentLimit, currentFilter);
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memproses aksi'
        });
    }
});

// --- Filter live ---
searchInput?.addEventListener('input', () => {
    currentFilter = searchInput.value.trim();
    currentPage = 1;
    loadPurchasingTable(currentPage, currentLimit, currentFilter);
});

// --- Render pagination ---
function renderPagination(pagination) {
    if (!paginationContainer) return;
    const {
        page,
        totalPages
    } = pagination;
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline-primary'} me-1" data-page="${i}">${i}</button>`;
    }
    paginationContainer.innerHTML = html;

    paginationContainer.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = parseInt(btn.dataset.page);
            if (p && p !== currentPage) {
                currentPage = p;
                loadPurchasingTable(currentPage, currentLimit);
            }
        });
    });
}

// --- Add item modal ---
document.getElementById('btnAddItem')?.addEventListener('click', async () => {
    if (!supplierSelect?.value) return showToast({
        type: 'warning',
        title: 'Perhatian',
        message: 'Pilih supplier terlebih dahulu'
    });

    await loadProducts(); // isi productSelect
    resetModalForm(document.getElementById('modalAddPurchasingItem'));

    // Set harga langsung berdasarkan produk pertama yang muncul
    const productSelect = document.getElementById('productSelect');
    const firstOption = productSelect.selectedOptions[0];
    if (firstOption) {
        document.getElementById('itemPrice').value = firstOption.dataset.price || 0;
    }

    new bootstrap.Modal(document.getElementById('modalAddPurchasingItem')).show();
});

// --- Submit add item ---
formAddItem?.addEventListener('submit', e => {
    e.preventDefault();
    const productSelect = document.getElementById('productSelect');
    const productId = productSelect.value;
    const productName = productSelect.selectedOptions[0].textContent;
    const qty = parseFloat(document.getElementById('itemQty').value);
    const price = parseFloat(document.getElementById('itemPrice').value);
    if (!productId || qty <= 0) return;

    const tbody = document.querySelector('#purchasingItemsTable tbody');
    const subtotal = qty * price;
    const row = document.createElement('tr');
    row.dataset.productId = productId;
    row.innerHTML = `
        <td>${productName}<input type="hidden" name="items[][productId]" value="${productId}"></td>
        <td>${qty}<input type="hidden" name="items[][qty]" value="${qty}"></td>
        <td>${price.toLocaleString()}<input type="hidden" name="items[][price]" value="${price}"></td>
        <td class="subtotal">${subtotal.toLocaleString()}</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="bx bx-trash"></i></button></td>
    `;
    tbody.appendChild(row);
    updateTotal();
    bootstrap.Modal.getInstance(document.getElementById('modalAddPurchasingItem')).hide();
});

// --- Remove item ---
document.querySelector('#purchasingItemsTable')?.addEventListener('click', e => {
    if (e.target.closest('.btn-remove-item')) {
        e.target.closest('tr').remove();
        updateTotal();
    }
});

// --- Submit create purchasing ---
formCreate?.addEventListener('submit', async e => {
    e.preventDefault();
    const rows = document.querySelectorAll('#purchasingItemsTable tbody tr');
    if (!rows.length) return showToast({
        type: 'warning',
        title: 'Peringatan',
        message: 'Tambahkan minimal 1 item'
    });

    const items = Array.from(rows).map(r => ({
        productId: r.dataset.productId,
        qty: parseFloat(r.querySelector('input[name="items[][qty]"]').value),
        price: parseFloat(r.querySelector('input[name="items[][price]"]').value)
    }));

    const formData = new FormData();
    formData.append('supplierId', supplierSelect.value);
    const notaFile = document.getElementById('uploadNota')?.files[0];
    if (notaFile) formData.append('notaFile', notaFile);
    formData.append('items', JSON.stringify(items));

    const btnSubmit = formCreate.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Menyimpan...';

    try {
        const data = await fetchJSON(API.create, {
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken
            },
            body: formData
        });
        if (data.success) {
            showToast({
                type: 'success',
                title: 'Sukses',
                message: 'Purchasing berhasil dibuat'
            });
            setTimeout(() => {
                window.location.href = '/purchasing';
            }, 1500);
        } else {
            showToast({
                type: 'danger',
                title: 'Gagal',
                message: data.message
            });
        }
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal membuat purchasing'
        });
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Simpan Purchasing';
    }
});

// --- Auto update harga ---
document.getElementById('productSelect')?.addEventListener('change', function () {
    document.getElementById('itemPrice').value = this.selectedOptions[0]?.dataset.price || 0;
});
