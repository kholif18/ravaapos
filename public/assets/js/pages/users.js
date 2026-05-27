import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';
import {
    confirmDelete
} from '/assets/js/utils/confirm.js';
import {
    initPagination
} from '/assets/js/utils/initPagination.js';

const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const modalCreate = document.getElementById('modalCreate');
const modalEdit = document.getElementById('modalEdit');
const formCreate = document.getElementById('formCreateUser');
const formEdit = document.getElementById('formEditUser');
const searchInput = document.getElementById('searchUser');

let currentPage = 1;
let currentLimit = 10;
let currentSearch = '';

// === Helpers ===
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// === Fetch & Render ===
async function fetchUsers({
    reset = false
} = {}) {
    if (reset) {
        currentPage = 1;
        currentSearch = '';
    }

    const query = new URLSearchParams({
        page: currentPage,
        limit: currentLimit,
        search: currentSearch,
    });

    try {
        const res = await fetch(`/users/partial?${query}`);
        const html = await res.text();

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const newWrapper = temp.querySelector('#userWrapper');
        const oldWrapper = document.getElementById('userWrapper');

        if (newWrapper && oldWrapper) {
            oldWrapper.innerHTML = newWrapper.innerHTML;
        }

        initEditButtons();
        initDeleteButtons();
        rebindPagination();

    } catch (err) {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data user'
        });
    }
}

function rebindPagination() {
    initPagination({
        onPageChange: (page) => {
            currentPage = page;
            fetchUsers();
        },
        onLimitChange: (limit) => {
            currentLimit = limit;
            currentPage = 1;
            fetchUsers();
        }
    });
}

// === Events ===
searchInput?.addEventListener(
    'input',
    debounce(e => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        fetchUsers();
    }, 300)
);

document.getElementById('resetFilter')?.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
    currentPage = 1;
    fetchUsers();
});

// === Form Handlers ===
formCreate?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(formCreate).entries());

    try {
        const res = await fetch('/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
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
            fetchUsers();
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
    const data = Object.fromEntries(new FormData(formEdit).entries());

    try {
        const res = await fetch(`/users/${id}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
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
            fetchUsers();
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

// === Button Initializers ===
function initEditButtons() {
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            formEdit.dataset.id = button.dataset.id;
            document.getElementById('editName').value = button.dataset.name;
            document.getElementById('editUsername').value = button.dataset.username;
            document.getElementById('editEmail').value = button.dataset.email === 'null' ? '' : button.dataset.email;
            document.getElementById('editRole').value = button.dataset.role;
            document.getElementById('editIsActive').checked = button.dataset.active === 'true';
            document.getElementById('editPassword').value = '';
        });
    });
}

function initDeleteButtons() {
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const confirmed = await confirmDelete('User ini akan dihapus dan tidak bisa dikembalikan.');
            if (!confirmed) return;

            try {
                const res = await fetch(`/users/${id}/delete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
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
                    fetchUsers();
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

// Init
fetchUsers();
