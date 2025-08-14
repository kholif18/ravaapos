import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

const formCreate = document.getElementById('formCreatePurchasing');
const formAddItem = document.getElementById('formAddItem');
const supplierSelect = document.getElementById('supplierSelect');
const purchasingTotal = document.getElementById('purchasingTotal');

const API = {
    suppliers: '/purchasing/suppliers',
    products: '/products/json',
    create: '/purchasing/create'
};

// Helper fetch JSON
async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Network error');
    return res.json();
}

// Load suppliers
async function loadSuppliers() {
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

// Load products berdasarkan supplier terpilih
async function loadProducts() {
    if (!supplierSelect?.value) return;
    try {
        const res = await fetchJSON(`${API.products}?supplierId=${supplierSelect.value}`);
        const select = document.getElementById('productSelect');
        if (select && res.products) {
            select.innerHTML = res.products
                .map(p => `<option value="${p.id}" data-price="${p.salePrice}">${p.name}</option>`)
                .join('');
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

// Update total harga
function updateTotal() {
    const tbody = document.querySelector('#purchasingItemsTable tbody');
    let total = 0;
    tbody.querySelectorAll('tr').forEach(r => {
        total += Number(r.cells[3].textContent.replace(/,/g, '')) || 0;
    });
    purchasingTotal.textContent = total.toLocaleString();
}

// Event: Supplier change → load products
supplierSelect?.addEventListener('change', loadProducts);

// Event: Button "Tambah Item"
document.getElementById('btnAddItem')?.addEventListener('click', async () => {
    if (!supplierSelect?.value) {
        return showToast({
            type: 'warning',
            title: 'Perhatian',
            message: 'Pilih supplier terlebih dahulu'
        });
    }

    await loadProducts();
    resetModalForm(document.getElementById('modalAddPurchasingItem'));

    // Set harga produk pertama
    const productSelect = document.getElementById('productSelect');
    const firstOption = productSelect.selectedOptions[0];
    if (firstOption) {
        document.getElementById('itemPrice').value = firstOption.dataset.price || 0;
    }

    new bootstrap.Modal(document.getElementById('modalAddPurchasingItem')).show();
});

// Event: Submit form tambah item
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

// Event: Remove item dari tabel
document.querySelector('#purchasingItemsTable')?.addEventListener('click', e => {
    if (e.target.closest('.btn-remove-item')) {
        e.target.closest('tr').remove();
        updateTotal();
    }
});

// Event: Submit form create purchasing
formCreate?.addEventListener('submit', async e => {
    e.preventDefault();

    const rows = document.querySelectorAll('#purchasingItemsTable tbody tr');
    if (!rows.length) {
        return showToast({
            type: 'warning',
            title: 'Peringatan',
            message: 'Tambahkan minimal 1 item'
        });
    }

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

// Auto update harga produk saat diganti
document.getElementById('productSelect')?.addEventListener('change', function () {
    document.getElementById('itemPrice').value = this.selectedOptions[0]?.dataset.price || 0;
});

// Init
document.addEventListener('DOMContentLoaded', loadSuppliers);
