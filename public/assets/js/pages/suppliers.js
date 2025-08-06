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
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const form = document.getElementById('formEditSupplier');
            form.dataset.id = btn.dataset.id;
            form.querySelector('[name="name"]').value = btn.dataset.name;
            form.querySelector('[name="phone"]').value = btn.dataset.phone;
            form.querySelector('[name="email"]').value = btn.dataset.email;
            form.querySelector('[name="address"]').value = btn.dataset.address;
            form.querySelector('[name="note"]').value = btn.dataset.note;
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const confirmed = await confirmDelete('Supplier ini akan dihapus dan tidak dapat dikembalikan.');
            if (!confirmed) return;

            try {
                const res = await fetch(`/suppliers/${id}/delete`, {
                    method: 'POST'
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

    try {
        const res = await fetch('/suppliers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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

    try {
        const res = await fetch(`/suppliers/${id}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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

// Modal reset & focus
['modalCreate', 'modalEdit'].forEach(id => {
    const modal = document.getElementById(id);
    modal?.addEventListener('shown.bs.modal', () => modal.querySelector('input[name="name"]').focus());
    modal?.addEventListener('hidden.bs.modal', () => resetModalForm(modal));
});

// Init
loadSuppliers();
