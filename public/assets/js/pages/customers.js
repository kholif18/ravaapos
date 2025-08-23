// public/assets/js/pages/customers.js
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
const modalEl = document.getElementById('modalCustomer');
const form = document.getElementById('formCustomer') || document.getElementById('customerForm');
const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
const typeSelect = form ? form.querySelector('[name="type"]') : null;
const memberFields = ['#memberFields', '#memberFieldsDiskon', '#memberFieldsPoin']
    .map(id => document.querySelector(id))
    .filter(Boolean);
const thNama = document.getElementById('thNama');

let currentPage = 1;
let currentLimit = 10;
let currentSearch = '';
let currentType = '';
let currentStatus = '';
let currentSort = 'name';
let currentOrder = 'asc';
let hasSorted = false;

// helpers
function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

function toggleMemberFields(isMember) {
    memberFields.forEach(el => el.classList.toggle('d-none', !isMember));
}

function safeParseCustomer(encoded) {
    try {
        return JSON.parse(atob(encoded));
    } catch (err) {
        console.error('Failed to parse customer data', err);
        return null;
    }
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

// main pagination binding using your util
function bindPaginationHandlers(pagination) {
    // pagination param is not strictly needed here, but we call initPagination so it binds DOM controls
    initPagination({
        onPageChange: (p) => {
            currentPage = p;
            loadCustomers(currentPage, currentLimit);
        },
        onLimitChange: (newLimit) => {
            currentLimit = newLimit;
            currentPage = 1;
            loadCustomers(currentPage, currentLimit);
        }
    });
}

// load data from JSON endpoint
async function loadCustomers(page = 1, limit = currentLimit) {
    currentPage = page;

    const params = new URLSearchParams({
        page,
        limit,
        search: currentSearch,
        type: currentType,
        status: currentStatus,
        sort: currentSort,
        order: currentOrder
    });

    try {
        const res = await fetch(`/customers/partial?${params}`);
        if (!res.ok) throw new Error('Jaringan bermasalah');

        const html = await res.text();
        const wrapper = document.getElementById('customerWrapper');
        if (wrapper) {
            wrapper.innerHTML = html;
            rebindAfterRender();
            updateSortIcon();
        }

        initPagination({
            onPageChange: (page) => {
                currentPage = page;
                loadCustomers();
            },
            onLimitChange: (limit) => {
                currentLimit = limit;
                currentPage = 1;
                loadCustomers();
            }
        });
    } catch (err) {
        console.error(err);
        showToast({
            title: 'Error',
            message: 'Gagal memuat data customer',
            type: 'danger'
        });
    }
}

document.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-delete');

    if (editBtn) {
        const data = safeParseCustomer(editBtn.dataset.customer);
        if (!data) return showToast({
            title: 'Error',
            message: 'Data customer rusak',
            type: 'danger'
        });

        if (form) {
            form.action = `/customers/${data.id}/update`;
            Object.keys(data).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = data[key]?? '';
            });
            toggleMemberFields(data.type === 'member');
        }

        const title = modalEl?.querySelector('.modal-title');
        if (title) title.textContent = 'Edit Customer';
        modal?.show();
    }

    if (delBtn) {
        const id = delBtn.dataset.id;
        const name = delBtn.dataset.name;
        const confirmed = await confirmDelete(`Hapus customer "${name}"?`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/customers/${id}/delete`, {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken
                }
            });
            const result = await res.json();

            if (res.ok && result.success) {
                showToast({
                    title: 'Berhasil',
                    message: result.message,
                    type: 'success'
                });
                loadCustomers(currentPage, currentLimit);
            } else {
                showToast({
                    title: 'Gagal',
                    message: result.message,
                    type: 'danger'
                });
            }
        } catch (err) {
            console.error(err);
            showToast({
                title: 'Error',
                message: 'Gagal menghapus customer',
                type: 'danger'
            });
        }
    }
});

// View
function showCustomerDetail(data) {
    document.getElementById('detailName').textContent = data.name || '-';
    document.getElementById('detailPhone').textContent = data.phone || '-';
    document.getElementById('detailType').textContent = data.type || '-';
    document.getElementById('detailStatus').textContent = data.status || '-';
    document.getElementById('detailBirthdate').textContent = data.birthdate || '-';
    document.getElementById('detailAddress').textContent = data.address || '-';
    document.getElementById('detailNote').textContent = data.note || '-';

    const emailEl = document.getElementById('detailEmail');
    if (data.email) {
        emailEl.textContent = data.email;
        emailEl.href = `mailto:${data.email}`;
    } else {
        emailEl.textContent = '-';
        emailEl.removeAttribute('href');
    }

    const modal = new bootstrap.Modal(document.getElementById('modalDetailCustomer'));
    modal.show();
}

document.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.btn-view');
    if (viewBtn) {
        const data = safeParseCustomer(viewBtn.dataset.customer);
        if (!data) return showToast({
            title: 'Error',
            message: 'Data rusak',
            type: 'danger'
        });

        showCustomerDetail(data);
    }
});

// === Sorting Handler ===
function rebindAfterRender() {
    const newThNama = document.getElementById('thNama');
    newThNama?.addEventListener('click', handleSortByName);
    updateSortIcon();

    bindPaginationHandlers(); // agar pagination tetap berfungsi
}

function handleSortByName() {
    hasSorted = true;
    if (currentSort === 'name') {
        currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = 'name';
        currentOrder = 'asc';
    }
    currentPage = 1;
    loadCustomers();
}

document.getElementById('thNama')?.addEventListener('click', handleSortByName);

// Search inputs and filters
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    const onSearch = debounce((e) => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadCustomers(1, currentLimit);
    }, 300);
    searchInput.addEventListener('input', onSearch);
}

const filterType = document.getElementById('filterType');
if (filterType) {
    filterType.addEventListener('change', (e) => {
        currentType = e.target.value;
        currentPage = 1;
        loadCustomers(1, currentLimit);
    });
}

const filterStatus = document.getElementById('filterStatus');
if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
        currentStatus = e.target.value;
        currentPage = 1;
        loadCustomers(1, currentLimit);
    });
}

const resetBtn = document.getElementById('btnResetFilter');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        currentSearch = '';
        currentType = '';
        currentStatus = '';
        currentSort = 'createdAt';
        currentOrder = 'desc';

        if (searchInput) searchInput.value = '';
        if (filterType) filterType.value = '';
        if (filterStatus) filterStatus.value = '';

        loadCustomers(1, currentLimit);
    });
}

// Form submit (create / update)
if (form) {
    // set default action if not set
    if (!form.action || form.action.trim() === '') form.action = '/customers';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(form).entries());

        // normalize empty strings to null
        Object.keys(formData).forEach(k => {
            if (typeof formData[k] === 'string' && formData[k].trim() === '') formData[k] = null;
        });

        const url = form.action;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify(formData)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                modal?.hide();
                resetModalForm(modalEl || form, {
                    defaultAction: '/customers',
                    hideFields: memberFields.map(el => `#${el.id}`)
                });
                showToast({
                    title: 'Berhasil',
                    message: result.message,
                    type: 'success'
                });
                loadCustomers(currentPage, currentLimit);
            } else {
                showToast({
                    title: 'Gagal',
                    message: result.message || 'Terjadi kesalahan',
                    type: 'danger'
                });
            }
        } catch (err) {
            console.error(err);
            showToast({
                title: 'Error',
                message: 'Kesalahan server',
                type: 'danger'
            });
        }
    });
}

// Modal behaviour: open create modal
const btnOpenCreate = document.getElementById('btnOpenModalCreate') || document.getElementById('btnAddCustomer');
if (btnOpenCreate && form) {
    btnOpenCreate.addEventListener('click', () => {
        // reset to create mode
        form.action = '/customers';
        resetModalForm(modalEl || form, {
            defaultAction: '/customers',
            hideFields: memberFields.map(el => `#${el.id}`),
            title: 'Tambah Customer'
        });
        const titleEl = modalEl?.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = 'Tambah Customer';
        modal?.show();
    });
}

// focus and reset handlers on modal close/open
if (modalEl) {
    modalEl.addEventListener('shown.bs.modal', () => {
        const inputName = form.querySelector('[name="name"]');
        if (inputName) inputName.focus();
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        resetModalForm(modalEl, {
            defaultAction: '/customers',
            hideFields: memberFields.map(el => `#${el.id}`),
            title: 'Tambah Customer'
        });
    });
}

// type change for showing member fields
if (typeSelect) {
    typeSelect.addEventListener('change', () => toggleMemberFields(typeSelect.value === 'member'));
}

document.getElementById('btnExportCSV')?.addEventListener('click', async () => {
    try {
        const params = new URLSearchParams({
            search: currentSearch,
            type: currentType,
            status: currentStatus,
            sort: currentSort,
            order: currentOrder
        });

        const res = await fetch(`/customers/export?${params}`);
        if (!res.ok) throw new Error('Gagal mengekspor CSV');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Gagal',
            message: 'Gagal mengekspor CSV.'
        });
    }
});

document.getElementById('btnTemplateCSV')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/customers/template-csv';
});

document.getElementById('formImportCSV')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const res = await fetch('/customers/import-csv', {
            method: 'POST',
            body: formData,
            credentials: 'same-origin'
        });

        const result = await res.json();
        if (res.ok && result.success) {
            showToast({
                title: 'Sukses',
                message: result.message,
                type: 'success'
            });
            bootstrap.Modal.getInstance(document.getElementById('modalImportCSV')).hide();
            loadCustomers();
        } else {
            showToast({
                title: 'Gagal',
                message: result.message,
                type: 'danger'
            });
        }
    } catch (err) {
        console.error(err);
        showToast({
            title: 'Error',
            message: 'Terjadi kesalahan saat import',
            type: 'danger'
        });
    }
});


// === Init ===
loadCustomers();