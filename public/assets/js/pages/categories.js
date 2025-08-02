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
const tbody = document.getElementById('categoryTbody');

async function reloadTable() {
    try {
        const res = await fetch('/categories/partial');
        const html = await res.text();
        tbody.innerHTML = html;

        initDeleteButtons();
        initEditButtons();
    } catch (err) {
        console.error('Gagal memuat ulang tabel:', err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat ulang tabel'
        });
    }
}

document.getElementById('formCreateCategory').addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const name = formData.get('name');

    try {
        const res = await fetch('/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name
            })
        });

        const result = await res.json();
        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(modalCreate).hide();
            document.querySelector('button[data-bs-target="#modalCreate"]') ?.focus();
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
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Kesalahan server.'
        });
    }
});

document.getElementById('formEditCategory').addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = this.dataset.id;
    const name = document.getElementById('editName').value;

    try {
        const res = await fetch(`/categories/${id}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name
            })
        });

        const result = await res.json();
        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(modalEdit).hide();
            document.querySelector('button[data-bs-target="#modalCreate"]')?.focus();
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
    } catch (err) {
        console.error(err);
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
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const form = document.getElementById('formEditCategory');

            document.getElementById('editName').value = name;
            form.dataset.id = id;
        });
    });
}

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
                } catch (err) {
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
    icon.classList.remove('bx-sort-alt-2', 'bx-sort-up', 'bx-sort-down');
    icon.classList.add(ascending ? 'bx-sort-down' : 'bx-sort-up');
}

let isAscending = true;
document.getElementById('thNama')?.addEventListener('click', () => {
    isAscending = !isAscending;
    sortCategoryTableByName(isAscending);
    updateCategorySortIcon(isAscending);
});


modalCreate.addEventListener('shown.bs.modal', () => {
    modalCreate.querySelector('input[name="name"]').focus();
});

modalEdit.addEventListener('shown.bs.modal', () => {
    document.getElementById('editName').focus();
});

modalCreate.addEventListener('hidden.bs.modal', () => resetModalForm(modalCreate));
modalEdit.addEventListener('hidden.bs.modal', () => resetModalForm(modalEdit));

initDeleteButtons();
initEditButtons();