import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';
import {
    confirmDelete
} from '/assets/js/utils/confirm.js';

document.addEventListener('DOMContentLoaded', () => {
    const modalCreate = document.getElementById('modalCreate');
    const modalEdit = document.getElementById('modalEdit');
    const tbody = document.getElementById('categoryTbody');
    const formCreate = document.getElementById('formCreateCategory');
    const formEdit = document.getElementById('formEditCategory');
    const inputPrefix = document.getElementById('categoryPrefix');
    const prefixError = document.getElementById('prefixError');

    // Reload table
    async function reloadTable() {
        try {
            const res = await fetch('/categories/partial');
            const html = await res.text();
            tbody.innerHTML = html;
            initDeleteButtons();
            initEditButtons();
        } catch (err) {
            showToast({
                type: 'danger',
                title: 'Error',
                message: 'Gagal memuat ulang tabel'
            });
        }
    }

    // Debounce
    function debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    // Search
    document.getElementById('searchCategory')?.addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('resetFilter')?.addEventListener('click', () => {
        document.getElementById('searchCategory').value = '';
        fetchCategories();
    });

    function handleSearch() {
        const keyword = document.getElementById('searchCategory').value.trim();
        fetchCategories({
            search: keyword
        });
    }

    function fetchCategories(params = {}) {
        const query = new URLSearchParams(params).toString();
        fetch(`/categories/search?${query}`)
            .then(res => res.text())
            .then(html => {
                tbody.innerHTML = html;
                initDeleteButtons();
                initEditButtons();
            });
    }

    // create
    formCreate.addEventListener('submit', async function (e) {
        e.preventDefault();

        const prefix = inputPrefix.value.trim();
        const isValid = /^[A-Z]{2,5}$/.test(prefix);
        if (!isValid) {
            inputPrefix.classList.add('is-invalid');
            prefixError.style.display = 'block';
            return;
        } else {
            inputPrefix.classList.remove('is-invalid');
            prefixError.style.display = 'none';
        }

        const data = Object.fromEntries(new FormData(this).entries());

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
                await reloadTable();
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

    // Edit
    formEdit.addEventListener('submit', async function (e) {
        e.preventDefault();
        const id = this.dataset.id;
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
                await reloadTable();
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

    // Edit buttons
    function initEditButtons() {
        document.querySelectorAll('button[data-bs-target="#modalEdit"]').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const name = button.getAttribute('data-name');
                const prefix = button.getAttribute('data-prefix');

                formEdit.dataset.id = id;
                document.getElementById('editName').value = name;
                document.getElementById('editPrefix').value = prefix;
            });
        });
    }

    // Delete buttons
    function initDeleteButtons() {
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');
                const confirmed = await confirmDelete("Kategori ini akan dihapus dan tidak bisa dikembalikan.");

                if (confirmed) {
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
                            await reloadTable();
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
                }
            });
        });
    }

    // Sorting
    function sortCategoryTableByName(ascending = true) {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            const aVal = a.querySelector('td[data-column="name"]')?.dataset.value?.toLowerCase() || '';
            const bVal = b.querySelector('td[data-column="name"]')?.dataset.value?.toLowerCase() || '';
            return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));
    }

    function updateCategorySortIcon(ascending) {
        const icon = document.getElementById('iconSortNama');
        icon?.classList.remove('bx-sort-alt-2', 'bx-sort-up', 'bx-sort-down');
        icon?.classList.add(ascending ? 'bx-sort-down' : 'bx-sort-up');
    }

    let isAscending = true;
    document.getElementById('thNama')?.addEventListener('click', () => {
        isAscending = !isAscending;
        sortCategoryTableByName(isAscending);
        updateCategorySortIcon(isAscending);
    });

    // Modal focus + reset
    modalCreate.addEventListener('shown.bs.modal', () => modalCreate.querySelector('input[name="name"]').focus());
    modalEdit.addEventListener('shown.bs.modal', () => document.getElementById('editName').focus());
    modalCreate.addEventListener('hidden.bs.modal', () => resetModalForm(modalCreate));
    modalEdit.addEventListener('hidden.bs.modal', () => resetModalForm(modalEdit));

    // Init awal
    initDeleteButtons();
    initEditButtons();
});
