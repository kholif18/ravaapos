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
    productsSearch: '/products/search',
    create: '/purchasing/create'
};

// Fetch JSON helper
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

// Update total harga
function updateTotal() {
    const tbody = document.querySelector('#purchasingItemsTable tbody');
    let total = 0;
    tbody.querySelectorAll('tr').forEach(r => {
        total += Number(r.cells[3].textContent.replace(/,/g, '')) || 0;
    });
    purchasingTotal.textContent = total.toLocaleString('id-ID');
}

document.addEventListener('DOMContentLoaded', () => {
    const productSelect = $('#productSelect2');
    productSelect.select2({
        placeholder: 'Ketik nama produk...',
        width: '100%',
        allowClear: true,
        dropdownParent: $('#modalAddPurchasingItem'),
        ajax: {
            url: API.productsSearch,
            dataType: 'json',
            delay: 250,
            data: params => ({
                supplierId: supplierSelect.value,
                term: params.term || ''
            }),
            processResults: data => ({
                results: (data.results || []).map(p => ({
                    id: p.id,
                    text: p.text,
                    cost: p.price
                }))
            }),
            cache: true
        }
    });

    productSelect.on('select2:select', e => {
        const selected = e.params.data;
        document.getElementById('itemPrice').value = selected.cost || 0;
        document.getElementById('updateCost').checked = false;
    });

    productSelect.on('select2:clear', () => {
        document.getElementById('itemPrice').value = 0;
        document.getElementById('updateCost').checked = false;
    });
});

const modalAddItem = document.getElementById('modalAddPurchasingItem');
const bsModalAddItem = new bootstrap.Modal(modalAddItem);

// Pasang listener sekali
document.getElementById('btnOpenModalCreate')?.addEventListener('click', () => {
    if (!supplierSelect?.value) return showToast({
        type: 'warning',
        title: 'Perhatian',
        message: 'Pilih supplier terlebih dahulu'
    });

    resetModalForm(modalAddItem);
    bsModalAddItem.show(); // Show modal, Select2 sudah siap
});

modalAddItem.addEventListener('hidden.bs.modal', () => {
    // Reset form input/checkbox
    resetModalForm(modalAddItem, {
        defaults: {
            itemPrice: 0,
            updateCost: false
        }
    });

    // Reset Select2
    const productSelect = $('#productSelect2');
    productSelect.val(null).trigger('change');

    // Reset harga & checkbox tambahan
    document.getElementById('itemPrice').value = 0;
    document.getElementById('updateCost').checked = false;

    // Reset quantity
    document.getElementById('itemQty').value = '';
});

// Submit form tambah item
formAddItem?.addEventListener('submit', e => {
    e.preventDefault();
    const productSelect = $('#productSelect2');
    const selectedData = productSelect.select2('data')[0];
    if (!selectedData) return;

    const productId = selectedData.id;
    const productName = selectedData.text;
    const qty = parseFloat(document.getElementById('itemQty').value);
    const price = parseFloat(document.getElementById('itemPrice').value);
    const updateCost = document.getElementById('updateCost').checked;

    if (qty <= 0) return;

    const tbody = document.querySelector('#purchasingItemsTable tbody');
    const subtotal = qty * price;
    const row = document.createElement('tr');
    row.dataset.productId = productId;
    row.dataset.updateCost = updateCost ? '1' : '0';
    row.innerHTML = `
        <td>${productName}<input type="hidden" name="items[][productId]" value="${productId}"></td>
        <td>${qty}<input type="hidden" name="items[][qty]" value="${qty}"></td>
        <td>${price.toLocaleString()}<input type="hidden" name="items[][price]" value="${price}"></td>
        <td class="subtotal">${subtotal.toLocaleString()}</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="bx bx-trash"></i></button></td>
    `;
    tbody.appendChild(row);
    updateTotal();

    // Cukup hide modal, listener hidden.bs.modal akan handle reset
    bsModalAddItem.hide();
});

// Hapus item
document.querySelector('#purchasingItemsTable')?.addEventListener('click', e => {
    if (e.target.closest('.btn-remove-item')) {
        e.target.closest('tr').remove();
        updateTotal();
    }
});

// Submit form create purchasing
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
        price: parseFloat(r.querySelector('input[name="items[][price]"]').value),
        updateCost: r.dataset.updateCost === '1'
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
            setTimeout(() => window.location.href = '/purchasing', 1500);
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

// Init suppliers saat DOM siap
document.addEventListener('DOMContentLoaded', loadSuppliers);
