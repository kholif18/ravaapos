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

const modalCreate = document.getElementById('modalCreate');
const modalEdit = document.getElementById('modalEdit');
const formCreate = document.getElementById('formCreateCategory');
const formEdit = document.getElementById('formEditCategory');
const inputPrefix = document.getElementById('categoryPrefix');
const prefixError = document.getElementById('prefixError');
const searchInput = document.getElementById('searchCategory');
const thNama = document.getElementById('thNama');

let currentPage = 1;
let currentLimit = 10;
let currentSearch = '';
let currentSort = 'name';
let currentOrder = 'asc';
let hasSorted = false;

// === Helpers ===
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

function updateSortIcon() {
    const iconSort = document.getElementById('thNama')?.querySelector('i');
    if (!iconSort) return;

    iconSort.className = !hasSorted ?
        'bx bx-sort-alt-2' :
        currentOrder === 'asc' ?
        'bx bx-up-arrow-alt' :
        'bx bx-down-arrow-alt';
}

// === Fetch & Render ===
async function fetchCategories({
    reset = false
} = {}) {
    if (reset) {
        currentPage = 1;
        currentSearch = '';
        hasSorted = false;
        currentSort = 'name';
        currentOrder = 'asc';
    }

    const query = new URLSearchParams({
        page: currentPage,
        limit: currentLimit,
        search: currentSearch,
        sort: currentSort,
        order: currentOrder,
    });

    try {
        const res = await fetch(`/categories/partial?${query}`);
        const html = await res.text();

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const newWrapper = temp.querySelector('#categoryWrapper');
        const oldWrapper = document.getElementById('categoryWrapper');

        if (newWrapper && oldWrapper) {
            oldWrapper.innerHTML = newWrapper.innerHTML;
            rebindAfterRender(); // <== ini kunci penting!
        }

        initEditButtons();
        initDeleteButtons();
        rebindPagination();
        updateSortIcon();

        initPagination({
            onPageChange: (page) => {
                currentPage = page;
                fetchCategories();
            },
            onLimitChange: (limit) => {
                currentLimit = limit;
                currentPage = 1;
                fetchCategories();
            }
        });
        
    } catch (err) {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data kategori'
        });
    }
}

function rebindPagination() {
    document.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const page = parseInt(btn.dataset.page);
            if (!isNaN(page)) {
                currentPage = page;
                fetchCategories();
            }
        });
    });

    const limitSelect = document.querySelector('#limitSelect');
    if (limitSelect) {
        limitSelect.addEventListener('change', () => {
            const limit = parseInt(limitSelect.value);
            if (!isNaN(limit)) {
                currentLimit = limit;
                currentPage = 1;
                fetchCategories();
            }
        });
    }
}

// === Events ===
searchInput?.addEventListener(
    'input',
    debounce(e => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        fetchCategories();
    }, 300)
);

document.getElementById('resetFilter')?.addEventListener('click', () => {
    searchInput.value = '';
    currentSearch = '';
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

// === Form Handlers ===
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

// === Button Initializers ===
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

function rebindAfterRender() {
    // Re-attach sort listener
    const newThNama = document.getElementById('thNama');
    newThNama?.addEventListener('click', () => {
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

    // Re-update sort icon (karena <thead> direplace)
    updateSortIcon();

    // Re-attach pagination & limit
    initPagination({
        onPageChange: (page) => {
            currentPage = page;
            fetchCategories();
        },
        onLimitChange: (limit) => {
            currentLimit = limit;
            currentPage = 1;
            fetchCategories();
        }
    });
}

// === Modal Focus & Reset ===
modalCreate.addEventListener('shown.bs.modal', () =>
    modalCreate.querySelector('input[name="name"]').focus()
);
modalEdit.addEventListener('shown.bs.modal', () =>
    document.getElementById('editName').focus()
);
modalCreate.addEventListener('hidden.bs.modal', () =>
    resetModalForm(modalCreate)
);
modalEdit.addEventListener('hidden.bs.modal', () =>
    resetModalForm(modalEdit)
);

// Init
fetchCategories();
