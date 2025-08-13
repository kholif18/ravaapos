import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';
import {
    initPagination
} from '/assets/js/utils/initPagination.js';

const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const form = document.getElementById('formCreatePurchasing');

let currentPage = 1;
let currentLimit = 10;
let currentPurchasingId = null;

// --- Cache DOM ---
const tableBody = document.querySelector('#tablePurchasings tbody');
const paginationContainer = document.getElementById('paginationContainer');

// --- Helper URLs ---
const API = {
    purchasing: '/purchasing',
    suppliers: '/purchasing/suppliers',
    products: '/products/list',
    pagination: '/purchasing/partials/pagination'
};

// --- Fetch helper ---
async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Network error');
    return res.json();
}

// --- Load Purchasings ---
async function loadPurchasings(page = 1, limit = 10) {
    if (!tableBody || !paginationContainer) return;

    try {
        const params = new URLSearchParams({
            page,
            limit
        });
        const data = await fetchJSON(`${API.purchasing}/list?${params}`);

        tableBody.innerHTML = '';
        if (!data.data.length) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Tidak ada data</td></tr>`;
            paginationContainer.innerHTML = '';
            return;
        }

        data.data.forEach((p, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(page - 1) * limit + idx + 1}</td>
                <td>${new Date(p.date).toLocaleDateString()}</td>
                <td>${p.supplierName}</td>
                <td>${p.total.toLocaleString()}</td>
                <td>
                    ${p.status === 'completed' ? '<span class="badge bg-success">Completed</span>' : ''}
                    ${p.status === 'draft' ? '<span class="badge bg-warning">Draft</span>' : ''}
                    ${p.status === 'cancelled' ? '<span class="badge bg-danger">Cancelled</span>' : ''}
                </td>
                <td>
                    <button class="btn btn-sm btn-info btn-view-purchasing" data-id="${p.id}">
                        <i class="bx bx-show"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // --- Pagination partial ---
        const paginationHTML = await fetch(`${API.pagination}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pagination: {
                    page,
                    totalPages: Math.ceil(data.total / limit),
                    limit,
                    totalItems: data.total
                }
            })
        }).then(res => res.text());

        paginationContainer.innerHTML = paginationHTML;

        // --- Init pagination events ---
        initPagination({
            onPageChange: (newPage) => {
                currentPage = newPage;
                loadPurchasings(currentPage, currentLimit);
            },
            onLimitChange: (newLimit) => {
                currentLimit = newLimit;
                currentPage = 1;
                loadPurchasings(currentPage, currentLimit);
            }
        });

    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal load daftar purchasing'
        });
    }
}

// --- Load Supplier Options ---
async function loadSuppliers() {
    try {
        const suppliers = await fetchJSON(API.suppliers);
        const select = document.getElementById('supplierSelect');
        select.innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal load suppliers'
        });
    }
}

// --- Load Product Options ---
async function loadProducts() {
    try {
        const products = await fetchJSON(API.products);
        const select = document.getElementById('productSelect');
        select.innerHTML = products.map(p => `<option value="${p.id}" data-price="${p.salePrice}">${p.name}</option>`).join('');
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal load products'
        });
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadPurchasings(currentPage, currentLimit);
});

// --- Modal Handlers ---
document.getElementById('btnCreatePurchasing')?.addEventListener('click', async () => {
    await loadSuppliers();
    currentPurchasingId = null;
    const tbody = document.getElementById('purchasingItemsTable').querySelector('tbody');
    tbody.innerHTML = '';
    document.getElementById('purchasingTotal').textContent = '0';
    resetModalForm(document.getElementById('modalCreatePurchasing'));
    new bootstrap.Modal(document.getElementById('modalCreatePurchasing')).show();
});

document.getElementById('btnAddItem')?.addEventListener('click', async () => {
    await loadProducts();
    resetModalForm(document.getElementById('modalAddPurchasingItem'));
    new bootstrap.Modal(document.getElementById('modalAddPurchasingItem')).show();
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const supplierId = document.getElementById('supplierSelect').value;
    const notaNumber = document.getElementById('notaNumber').value;
    const notaFile = document.getElementById('uploadNota').files[0];
    const rows = document.querySelectorAll('#purchasingItemsTable tbody tr');

    if (!rows.length) return alert('Tambahkan minimal 1 item');

    const items = Array.from(rows).map(r => ({
        productId: r.dataset.productId,
        qty: parseFloat(r.cells[1].textContent),
        price: parseFloat(r.cells[2].textContent.replace(/,/g, ''))
    }));

    const formData = new FormData();
    formData.append('supplierId', supplierId);
    formData.append('notaNumber', notaNumber);
    if (notaFile) formData.append('notaFile', notaFile);
    formData.append('items', JSON.stringify(items));

    const res = await fetch('/purchasing/create', {
        method: 'POST',
        headers: {
            'CSRF-Token': csrfToken
        },
        body: formData
    });

    const data = await res.json();
    if (data.success) {
        alert('Purchasing berhasil dibuat');
        window.location.href = '/purchasing';
    } else {
        alert(data.message || 'Gagal menyimpan purchasing');
    }
});

// --- Submit Add Item ---
document.getElementById('formAddItem').addEventListener('submit', (e) => {
    e.preventDefault();
    const productSelect = document.getElementById('productSelect');
    const productId = productSelect.value;
    const productName = productSelect.selectedOptions[0].textContent;
    const qty = parseFloat(document.getElementById('itemQty').value);
    const price = parseFloat(document.getElementById('itemPrice').value);
    const subtotal = qty * price;

    const tbody = document.getElementById('purchasingItemsTable').querySelector('tbody');
    const row = document.createElement('tr');
    row.dataset.productId = productId;
    row.innerHTML = `
        <td>${productName}</td>
        <td>${qty}</td>
        <td>${price.toLocaleString()}</td>
        <td>${subtotal.toLocaleString()}</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="bx bx-trash"></i></button></td>
    `;
    tbody.appendChild(row);

    updateTotal();
    bootstrap.Modal.getInstance(document.getElementById('modalAddPurchasingItem')).hide();
});

// --- Remove Item ---
document.getElementById('purchasingItemsTable').addEventListener('click', (e) => {
    if (e.target.closest('.btn-remove-item')) {
        e.target.closest('tr').remove();
        updateTotal();
    }
});

// --- Update Total ---
function updateTotal() {
    const rows = document.getElementById('purchasingItemsTable').querySelectorAll('tbody tr');
    let total = 0;
    rows.forEach(r => total += Number(r.cells[3].textContent.replace(/,/g, '')) || 0);
    document.getElementById('purchasingTotal').textContent = total.toLocaleString();
}

// --- Submit Create Purchasing ---
document.getElementById('formCreatePurchasing').addEventListener('submit', async (e) => {
    e.preventDefault();
    const supplierId = document.getElementById('supplierSelect').value;
    const rows = document.getElementById('purchasingItemsTable').querySelectorAll('tbody tr');

    if (!rows.length) return showToast({
        type: 'warning',
        title: 'Peringatan',
        message: 'Tambahkan minimal 1 item'
    });

    const items = Array.from(rows).map(r => ({
        productId: r.dataset.productId,
        qty: parseFloat(r.cells[1].textContent),
        price: parseFloat(r.cells[2].textContent.replace(/,/g, ''))
    }));

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Menyimpan...';

    try {
        const data = await fetchJSON(`${API.purchasing}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                supplierId,
                items
            })
        });

        if (data.success) {
            showToast({
                type: 'success',
                title: 'Sukses',
                message: 'Purchasing berhasil dibuat'
            });
            bootstrap.Modal.getInstance(document.getElementById('modalCreatePurchasing')).hide();
            loadPurchasings(currentPage, currentLimit);
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
        btnSubmit.textContent = 'Selesaikan Purchasing';
    }
});
