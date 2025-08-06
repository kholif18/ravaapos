// public/assets/js/pages/categories.js - Refactored with AJAX pagination & sort icon update

import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';
import {
    confirmDelete
} from '/assets/js/utils/confirm.js';

const modalCreate = document.getElementById('modalCreate');
const modalEdit = document.getElementById('modalEdit');
const tableWrapper = document.getElementById('categoryTableWrapper');
const formCreate = document.getElementById('formCreateCategory');
const formEdit = document.getElementById('formEditCategory');
const inputPrefix = document.getElementById('categoryPrefix');
const prefixError = document.getElementById('prefixError');
const limitSelect = document.getElementById('limitSelect');
const searchInput = document.getElementById('searchCategory');
const thNama = document.getElementById('thNama');

let currentPage = 1;
let currentLimit = parseInt(limitSelect?.value || 10);
let currentSearch = '';
let currentSort = 'name';
let currentOrder = 'asc';
let hasSorted = false;


function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

async function fetchCategories() {
    const query = new URLSearchParams({
        page: currentPage,
        limit: currentLimit,
        search: currentSearch,
        sort: currentSort,
        order: currentOrder,
    }).toString();

    try {
        const res = await fetch(`/categories/partial?${query}`);
        const html = await res.text();
        tableWrapper.innerHTML = html;
        initEditButtons();  
        initDeleteButtons();
        initPaginationLinks();
        updateSortIcon();
    } catch (err) {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data kategori'
        });
    }
}

function updateSortIcon() {
    const iconSort = thNama?.querySelector('i');
    if (!iconSort) return;

    if (!hasSorted) {
        iconSort.className = 'bx bx-sort-alt-2';
        return;
    }

    if (currentSort === 'name') {
        iconSort.className = currentOrder === 'asc' ? 'bx bx-up-arrow-alt' : 'bx bx-down-arrow-alt';
    } else {
        iconSort.className = 'bx bx-sort-alt-2';
    }
}


searchInput?.addEventListener('input', debounce(e => {
    currentSearch = e.target.value.trim();
    currentPage = 1;
    fetchCategories();
}, 300));

document.getElementById('resetFilter')?.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    currentPage = 1;
    fetchCategories();
});

limitSelect?.addEventListener('change', () => {
    currentLimit = parseInt(limitSelect.value);
    currentPage = 1;
    fetchCategories();
});

thNama?.addEventListener('click', () => {
    hasSorted = true;
    if (currentSort === 'name') {
        currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = 'name';
        currentOrder = 'asc';
    }
    currentPage = 1;
    fetchCategories();
});

function initPaginationLinks() {
    document.querySelectorAll('.page-link[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (!isNaN(page)) {
                currentPage = page;
                fetchCategories();
            }
        });
    });
}

formCreate?.addEventListener('submit', async e => {
    e.preventDefault();
    const prefix = inputPrefix.value.trim();
    if (!/^[A-Z]{2,5}$/.test(prefix)) {
        inputPrefix.classList.add('is-invalid');
        prefixError.style.display = 'block';
        return;
    } else {
        inputPrefix.classList.remove('is-invalid');
        prefixError.style.display = 'none';
    }

    const data = Object.fromEntries(new FormData(formCreate).entries());

    try {
        const res = await fetch('/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(modalCreate).hide();
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: result.message
            });
            resetModalForm(modalCreate);
            fetchCategories();
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
            message: 'Kesalahan server.'
        });
    }
});

formEdit?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = formEdit.dataset.id;
    const data = {
        name: document.getElementById('editName').value,
        prefix: document.getElementById('editPrefix').value,
    };
    try {
        const res = await fetch(`/categories/${id}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(modalEdit).hide();
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: result.message
            });
            resetModalForm(modalEdit);
            fetchCategories();
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
            message: 'Kesalahan server.'
        });
    }
});

function initEditButtons() {
    document.querySelectorAll('button[data-bs-target="#modalEdit"]').forEach(button => {
        button.addEventListener('click', () => {
            formEdit.dataset.id = button.dataset.id;
            document.getElementById('editName').value = button.dataset.name;
            document.getElementById('editPrefix').value = button.dataset.prefix;
        });
    });
}

function initDeleteButtons() {
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const confirmed = await confirmDelete('Kategori ini akan dihapus dan tidak bisa dikembalikan.');
            if (!confirmed) return;
            try {
                const res = await fetch(`/categories/${id}/delete`, {
                    method: 'POST'
                });
                const result = await res.json();
                if (res.ok && result.success) {
                    showToast({
                        type: 'success',
                        title: 'Dihapus',
                        message: result.message
                    });
                    fetchCategories();
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
                    message: 'Terjadi kesalahan.'
                });
            }
        });
    });
}

modalCreate.addEventListener('shown.bs.modal', () => modalCreate.querySelector('input[name="name"]').focus());
modalEdit.addEventListener('shown.bs.modal', () => document.getElementById('editName').focus());
modalCreate.addEventListener('hidden.bs.modal', () => resetModalForm(modalCreate));
modalEdit.addEventListener('hidden.bs.modal', () => resetModalForm(modalEdit));

// Init awal
fetchCategories();
