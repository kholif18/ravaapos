import {
    showToast
} from '/assets/js/utils/toast.js';

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

const formCreate = document.getElementById('formCreatePurchasing');
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
        supplierSelect.innerHTML = `
            <option value="" selected disabled>Pilih supplier...</option>
            ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        `;
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal load suppliers'
        });
    }
}

document.getElementById("supplierSelect").addEventListener("change", function () {
    if (this.value) {
        this.setAttribute("disabled", true);
    }
});

document.getElementById("btnChangeSupplier").addEventListener("click", () => {
    document.getElementById("supplierSelect").removeAttribute("disabled");
});

// Init Select2 untuk product
const productSelect = $('#productSelect2');
productSelect.select2({
    placeholder: 'Ketik nama produk...',
    width: '100%',
    allowClear: true,
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

// Tombol Add Item
document.getElementById('btnAddItem')?.addEventListener('click', () => {
    const selectedData = productSelect.select2('data')[0];
    if (!selectedData) return showToast({
        type: 'warning',
        title: 'Peringatan',
        message: 'Pilih produk terlebih dahulu'
    });

    const productId = selectedData.id;
    const productName = selectedData.text;
    const cost = selectedData.cost || 0;

    const tbody = document.querySelector('#purchasingItemsTable tbody');

    // Cek apakah produk sudah ada di tabel
    if ([...tbody.querySelectorAll('tr')].some(r => r.dataset.productId === productId)) {
        return showToast({
            type: 'warning',
            title: 'Peringatan',
            message: 'Produk sudah ditambahkan'
        });
    }

    const row = document.createElement('tr');
    row.dataset.productId = productId;
    row.innerHTML = `
        <td>${productName}<input type="hidden" name="items[][productId]" value="${productId}"></td>
        <td><input type="number" class="form-control form-control-sm item-qty" name="items[][qty]" value="1" min="1"></td>
        <td><input type="number" class="form-control form-control-sm item-price" name="items[][price]" value="${cost}" min="0" step="0.01"></td>
        <td class="text-center"><input type="checkbox" class="form-check-input item-update-cost" name="items[][updateCost]"></td>
        <td class="subtotal">${cost.toLocaleString('id-ID')}</td>
        <td><button type="button" class="btn btn-sm btn-danger btn-remove-item"><i class="bx bx-trash"></i></button></td>
    `;
    tbody.appendChild(row);
    updateTotal();

    // Reset Select2
    productSelect.val(null).trigger('change');
});

// Update subtotal & total
function updateTotal() {
    const tbody = document.querySelector('#purchasingItemsTable tbody');
    let total = 0;
    tbody.querySelectorAll('tr').forEach(r => {
        const qty = parseFloat(r.querySelector('.item-qty').value) || 0;
        const price = parseFloat(r.querySelector('.item-price').value) || 0;
        const subtotal = qty * price;
        r.querySelector('.subtotal').textContent = subtotal.toLocaleString('id-ID');
        total += subtotal;
    });
    purchasingTotal.textContent = total.toLocaleString('id-ID');
}

// Listener untuk menghapus row
document.querySelector('#purchasingItemsTable')?.addEventListener('click', e => {
    if (e.target.closest('.btn-remove-item')) {
        e.target.closest('tr').remove();
        updateTotal();
    }
});

// Update subtotal saat qty/cost berubah
document.querySelector('#purchasingItemsTable tbody')?.addEventListener('input', e => {
    if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-price')) {
        updateTotal();
    }
});

// Submit form
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
        qty: parseFloat(r.querySelector('.item-qty').value),
        price: parseFloat(r.querySelector('.item-price').value),
        updateCost: r.querySelector('.item-update-cost').checked
    }));

    const formData = new FormData();
    formData.append('supplierId', supplierSelect.value);
    formData.append('note', document.getElementById('note')?.value || '');
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

document.addEventListener('DOMContentLoaded', loadSuppliers);
