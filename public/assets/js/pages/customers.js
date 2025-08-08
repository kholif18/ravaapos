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

const modalEl = document.getElementById('modalCustomer');
const form = document.getElementById('formCustomer') || document.getElementById('customerForm');
const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
const typeSelect = form ? form.querySelector('[name="type"]') : null;
const memberFields = ['#memberFields', '#memberFieldsDiskon', '#memberFieldsPoin']
    .map(id => document.querySelector(id))
    .filter(Boolean);

let currentPage = 1;
let currentLimit = 10;
let currentSearch = '';
let currentType = '';
let currentStatus = '';
let currentSort = 'name';
let currentOrder = 'ASC';

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

function escapeHtml(str = '') {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// render table rows from JSON data
function renderCustomerTable(customers = []) {
    // try several selectors to be tolerant with partials
    const tbody = document.getElementById('customerTableBody') || document.querySelector('#customerWrapper tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!customers || customers.length === 0) {
        const cols = tbody.closest('table')?.querySelectorAll('thead th').length || 7;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${cols}" class="text-center text-muted py-4">
                        Tidak ada data customer.
                    </td>`;
        tbody.appendChild(tr);
        return;
    }

    customers.forEach(c => {
        const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString('id-ID') : '-';
        const memberSince = c.memberSince ? new Date(c.memberSince).toLocaleDateString('id-ID') : '-';
        const statusBadge = c.status === 'active' ? 'success' : 'danger';
        const typeHtml = (c.type === 'member') ?
            `<span class="badge bg-primary">Member</span><br><small class="text-muted">Sejak ${memberSince}</small>` :
            `<span class="badge bg-secondary">Umum</span>`;

        const safeData = btoa(JSON.stringify(c));
        const safeNameAttr = escapeHtml(c.name || '');

        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${escapeHtml(c.name || '-')}</td>
      <td>${typeHtml}</td>
      <td>${escapeHtml(c.email || '-')}<br><small>${escapeHtml(c.phone || '-')}</small></td>
      <td>${created}</td>
      <td><span class="badge bg-${statusBadge}">${c.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
      <td class="text-center">
        <button class="btn btn-sm btn-warning me-1 btn-edit" data-customer="${safeData}" title="Edit"><i class="bx bx-edit"></i></button>
        <button class="btn btn-sm btn-danger btn-delete" data-id="${c.id}" data-name="${safeNameAttr}" title="Hapus"><i class="bx bx-trash"></i></button>
      </td>`;
        tbody.appendChild(tr);
    });
}

// bind edit/delete handlers (non-delegated helpers; we also use delegation below)
function initEditButtons() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.onclick = () => {
            const data = safeParseCustomer(btn.dataset.customer);
            if (!data) return showToast({
                title: 'Error',
                message: 'Data customer rusak',
                type: 'danger'
            });

            // set form action for update
            if (form) {
                form.action = `/customers/${data.id}/update`;
                // fill inputs if exist
                Object.keys(data).forEach(key => {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) input.value = data[key]?? '';
                });
                toggleMemberFields(data.type === 'member');
            }

            if (modalEl) {
                const title = modalEl.querySelector('.modal-title');
                if (title) title.textContent = 'Edit Customer';
                modal?.show();
            }
        };
    });
}

function initDeleteButtons() {
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            const confirmed = await confirmDelete(`Hapus customer "${name}"?`);
            if (!confirmed) return;

            try {
                const res = await fetch(`/customers/${id}/delete`, {
                    method: 'POST'
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
                        message: result.message || 'Gagal menghapus',
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
        };
    });
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
        const res = await fetch(`/customers/list?${params}`);
        if (!res.ok) throw new Error('Jaringan bermasalah');
        const json = await res.json();
        const {
            data = [], pagination = {}
        } = json;

        renderCustomerTable(data);
        // render pagination partial server-side? if you render pagination with EJS partial, you would replace wrapper. 
        // Here we call bindPaginationHandlers to wire up the buttons (initPagination expects data-page elements from EJS partial)
        bindPaginationHandlers(pagination);
    } catch (err) {
        console.error(err);
        showToast({
            title: 'Error',
            message: 'Gagal memuat data customer',
            type: 'danger'
        });
    }
}

// Delegated events (safer when rows are re-rendered)
document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-delete');

    if (editBtn) {
        editBtn.click(); // reuse non-delegated handler for simplicity (initEditButtons sets onclick)
    } else if (delBtn) {
        delBtn.click();
    }
});

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
        currentOrder = 'DESC';

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
                    'Content-Type': 'application/json'
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

// initial load
loadCustomers(currentPage, currentLimit);
