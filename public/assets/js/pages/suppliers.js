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
let maxPage = 1;
let currentSearch = '';

async function loadSuppliers(page = 1, limit = 10, search = '') {
    page = Math.max(1, page);
    currentSearch = search;

    try {
        // 1. Fetch partial HTML untuk tbody
        const tbodyRes = await fetch(`/suppliers/partial?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        const html = await tbodyRes.text();
        document.querySelector('#tableSupplier tbody').innerHTML = html;

        // 2. Fetch JSON pagination
        const jsonRes = await fetch(`/suppliers/json?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        const {
            pagination
        } = await jsonRes.json();

        currentPage = pagination.page;
        currentLimit = pagination.limit;
        maxPage = pagination.totalPages;

        renderPagination(pagination);
        initEditButtons();
        initDeleteButtons();
    } catch (err) {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data supplier.'
        });
    }
}


document.getElementById('searchSupplier').addEventListener('input', e => {
    const keyword = e.target.value.trim();
    loadSuppliers(1, currentLimit, keyword);
});

document.getElementById('resetFilter').addEventListener('click', () => {
    document.getElementById('searchSupplier').value = '';
    loadSuppliers(1, currentLimit, '');
});

function renderPagination(pagination) {
    const {
        page,
        totalPages,
        limit,
        totalItems
    } = pagination;
    const container = document.querySelector('#paginationContainer');
    const paginationEl = container.querySelector('ul.pagination');
    const infoEl = container.querySelector('.info');

    const buildBtn = (p, content, isActive = false, isDisabled = false) => `
    <li class="page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}">
    <a href="#" class="page-link btn-page" data-page="${p}">${content}</a>
    </li>
`;

    let html = '';

    // First and Prev
    html += buildBtn(1, '<<', false, page === 1);
    html += buildBtn(page - 1, '<', false, page === 1);

    // Ellipsis before
    if (page > 3) {
        html += buildBtn(1, '1');
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    // Page numbers around current page
    for (let i = Math.max(page - 2, 1); i <= Math.min(page + 2, totalPages); i++) {
        html += buildBtn(i, `${i}`, i === page);
    }

    // Ellipsis after
    if (page < totalPages - 2) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        html += buildBtn(totalPages, `${totalPages}`);
    }

    // Next and Last
    html += buildBtn(page + 1, '>', false, page === totalPages);
    html += buildBtn(totalPages, '>>', false, page === totalPages);

    paginationEl.innerHTML = html;
    infoEl.textContent = `Halaman ${page} dari ${totalPages} — Total ${totalItems} data`;
}


document.querySelector('#paginationContainer').addEventListener('click', (e) => {
    const link = e.target.closest('.btn-page');
    if (!link || link.closest('.page-item').classList.contains('disabled')) return;

    e.preventDefault(); // penting agar href="#" tidak scroll ke atas

    const page = parseInt(link.dataset.page);
    if (!isNaN(page)) {
        loadSuppliers(page, currentLimit, currentSearch);
    }
});


document.getElementById('limitSelect').addEventListener('change', e => {
    const newLimit = parseInt(e.target.value);
    loadSuppliers(1, newLimit, currentSearch);
});

function initEditButtons() {
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
}

function initDeleteButtons() {
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
                    loadSuppliers(currentPage, currentLimit);
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
}

document.getElementById('formCreateSupplier').addEventListener('submit', async function (e) {
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
            loadSuppliers(currentPage, currentLimit);
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
            message: 'Gagal menyimpan supplier.'
        });
    }
});

document.getElementById('formEditSupplier').addEventListener('submit', async function (e) {
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
            loadSuppliers(currentPage, currentLimit);
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
            message: 'Gagal mengubah supplier.'
        });
    }
});

document.getElementById('modalCreate').addEventListener('shown.bs.modal', () => {
    document.querySelector('#modalCreate input[name="name"]').focus();
});

document.getElementById('modalCreate').addEventListener('hidden.bs.modal', () => {
    resetModalForm(document.getElementById('modalCreate'));
});

document.getElementById('modalEdit').addEventListener('shown.bs.modal', () => {
    document.querySelector('#modalEdit input[name="name"]').focus();
});

document.getElementById('modalEdit').addEventListener('hidden.bs.modal', () => {
    resetModalForm(document.getElementById('modalEdit'));
});

// Initial load
loadSuppliers();
