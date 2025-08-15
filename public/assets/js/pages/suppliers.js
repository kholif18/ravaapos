// supplier.js
import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';
import {
    confirmDelete
} from '/assets/js/utils/confirm.js';

const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
let currentPage = 1;
let currentLimit = 10;
let currentSearch = '';

async function loadSuppliers(page = 1, limit = 10, search = '') {
    try {
        const htmlRes = await fetch(`/suppliers/partial?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        const html = await htmlRes.text();

        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newWrapper = temp.querySelector('#supplierWrapper');
        const oldWrapper = document.querySelector('#supplierWrapper');

        if (newWrapper && oldWrapper) {
            oldWrapper.replaceWith(newWrapper);
            bindEvents();
        }
    } catch (err) {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data supplier.'
        });
    }
}

function bindEvents() {
    // Edit
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const form = document.getElementById('formEditSupplier');

            try {
                const res = await fetch(`/suppliers/${id}/json`);
                const result = await res.json();

                if (!res.ok || !result.success) {
                    return showToast({
                        type: 'danger',
                        title: 'Gagal',
                        message: result.message || 'Gagal mengambil data supplier.'
                    });
                }

                const data = result.data;
                form.dataset.id = id;
                form.querySelector('[name="code"]').value = data.code || '';
                form.querySelector('[name="name"]').value = data.name || '';
                form.querySelector('[name="phone"]').value = data.phone || '';
                form.querySelector('[name="email"]').value = data.email || '';
                form.querySelector('[name="address"]').value = data.address || '';
                form.querySelector('[name="city"]').value = data.city || '';
                form.querySelector('[name="postalCode"]').value = data.postalCode || '';
                form.querySelector('[name="country"]').value = data.country || '';
                form.querySelector('[name="note"]').value = data.note || '';

                // Tampilkan modal setelah data masuk
                const modal = new bootstrap.Modal(document.getElementById('modalEdit'));
                modal.show();
            } catch (err) {
                console.error(err);
                showToast({
                    type: 'danger',
                    title: 'Error',
                    message: 'Gagal mengambil data supplier.'
                });
            }
        });
    });

    // Detail
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;

            try {
                const res = await fetch(`/suppliers/${id}/json`);
                const result = await res.json();
                if (!res.ok || !result.success) throw new Error(result.message || 'Gagal mengambil data.');

                const s = result.data;

                document.getElementById('detailCode').textContent = s.code || '-';
                document.getElementById('detailName').textContent = s.name || '-';
                document.getElementById('detailPhone').textContent = s.phone || '-';
                document.getElementById('detailEmail').innerHTML = s.email ? `<a href="mailto:${s.email}">${s.email}</a>` : '-';
                document.getElementById('detailAddress').textContent = s.address || '-';
                document.getElementById('detailCity').textContent = s.city || '-';
                document.getElementById('detailPostalCode').textContent = s.postalCode || '-';
                document.getElementById('detailCountry').textContent = s.country || '-';
                document.getElementById('detailNote').textContent = s.note || '-';

                const modal = new bootstrap.Modal(document.getElementById('modalDetailSupplier'));
                modal.show();
            } catch (err) {
                showToast({
                    type: 'danger',
                    title: 'Error',
                    message: err.message || 'Gagal menampilkan detail supplier.'
                });
            }
        });
    });
    
    // Delete
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;

            const confirmed = await confirmDelete('Supplier ini akan dihapus dan tidak dapat dikembalikan.');
            if (!confirmed) return;

            try {
                const res = await fetch(`/suppliers/${id}/delete`, {
                    method: 'POST',
                    headers: {
                        'CSRF-Token': csrfToken
                    }
                });
                const result = await res.json();

                if (res.ok && result.success) {
                    showToast({
                        type: 'success',
                        title: 'Dihapus',
                        message: result.message
                    });
                    loadSuppliers(currentPage, currentLimit, currentSearch);
                } else {
                    showToast({
                        type: 'danger',
                        title: 'Gagal',
                        message: result.message
                    });
                }
            } catch (err) {
                showToast({
                    type: 'danger',
                    title: 'Error',
                    message: 'Gagal menghapus supplier.'
                });
            }
        });
    });

    // Pagination
    document.querySelectorAll('.btn-page').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (!isNaN(page)) {
                currentPage = page;
                loadSuppliers(currentPage, currentLimit, currentSearch);
            }
        });
    });

    // Limit
    const limitSelect = document.getElementById('limitSelect');
    if (limitSelect) {
        limitSelect.addEventListener('change', e => {
            const newLimit = parseInt(e.target.value);
            if (!isNaN(newLimit)) {
                currentLimit = newLimit;
                currentPage = 1;
                loadSuppliers(currentPage, currentLimit, currentSearch);
            }
        });
    }
}

// Event: Search
const searchInput = document.getElementById('searchSupplier');
if (searchInput) {
    searchInput.addEventListener('input', e => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadSuppliers(currentPage, currentLimit, currentSearch);
    });
}

document.getElementById('resetFilter')?.addEventListener('click', () => {
    const input = document.getElementById('searchSupplier');
    input.value = '';
    currentSearch = '';
    currentPage = 1;
    loadSuppliers(currentPage, currentLimit, currentSearch);
});

// Create Supplier
const formCreate = document.getElementById('formCreateSupplier');
formCreate?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(this).entries());

    for (const key in formData) {
        if (typeof formData[key] === 'string' && formData[key].trim() === '') {
            formData[key] = null;
        }
    }
    
    try {
        const res = await fetch('/suppliers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(formData)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalCreate')).hide();
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: result.message
            });
            resetModalForm(document.getElementById('modalCreate'));
            loadSuppliers(currentPage, currentLimit, currentSearch);
        } else {
            showToast({
                type: 'danger',
                title: 'Gagal',
                message: result.message
            });
        }
    } catch {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal menyimpan supplier.'
        });
    }
});

// Update Supplier
const formEdit = document.getElementById('formEditSupplier');
formEdit?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = this.dataset.id;
    const formData = Object.fromEntries(new FormData(this).entries());

    for (const key in formData) {
        if (typeof formData[key] === 'string' && formData[key].trim() === '') {
            formData[key] = null;
        }
    }
    
    try {
        const res = await fetch(`/suppliers/${id}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(formData)
        });
        const result = await res.json();

        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalEdit')).hide();
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: result.message
            });
            resetModalForm(document.getElementById('modalEdit'));
            loadSuppliers(currentPage, currentLimit, currentSearch);
        } else {
            showToast({
                type: 'danger',
                title: 'Gagal',
                message: result.message
            });
        }
    } catch {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal mengubah supplier.'
        });
    }
});

document.getElementById('btnExportCSV')?.addEventListener('click', () => {
    window.location.href = '/suppliers/export-csv';
});

document.getElementById('formImportCSV')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    
    try {
        const res = await fetch('/suppliers/import-csv', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });
        const result = await res.json();

        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalImportCSV')).hide();
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: result.message
            });
            loadSuppliers(); // Reload data
        } else {
            showToast({
                type: 'danger',
                title: 'Gagal',
                message: result.message
            });
        }
    } catch (err) {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal import CSV'
        });
    }
});

document.querySelector('.btn-outline-info')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/suppliers/template-csv';
});

// Modal reset & focus
['modalCreate', 'modalEdit'].forEach(id => {
    const modal = document.getElementById(id);
    modal?.addEventListener('shown.bs.modal', () => modal.querySelector('input[name="name"]').focus());
    modal?.addEventListener('hidden.bs.modal', () => {
        resetModalForm(modal);
        if (id === 'modalCreate') {
            if (inputSupplierCode) inputSupplierCode.classList.remove('is-invalid');
            if (codeError) codeError.style.display = 'none';
        }
    });
});

// Auto-generate kode saat modalCreate dibuka
const modalCreate = document.getElementById('modalCreate');
const inputSupplierCode = document.getElementById('inputSupplierCode');
const codeError = document.getElementById('codeError');

modalCreate?.addEventListener('shown.bs.modal', async () => {
    try {
        const res = await fetch('/suppliers/generate-code');
        const data = await res.json();
        if (data.code) {
            inputSupplierCode.value = data.code;
            inputSupplierCode.classList.remove('is-invalid');
            codeError.style.display = 'none';
        }
    } catch (err) {
        console.error('Gagal generate kode supplier:', err);
    }
});

inputSupplierCode?.addEventListener('input', async () => {
    const code = inputSupplierCode.value.trim();
    if (!code) return;

    try {
        const res = await fetch(`/suppliers/check-code?code=${encodeURIComponent(code)}`);
        const data = await res.json();

        if (data.exists) {
            inputSupplierCode.classList.add('is-invalid');
            codeError.style.display = 'block';
        } else {
            inputSupplierCode.classList.remove('is-invalid');
            codeError.style.display = 'none';
        }
    } catch (err) {
        console.error('Gagal memeriksa kode supplier:', err);
    }
});

// Init
loadSuppliers();
