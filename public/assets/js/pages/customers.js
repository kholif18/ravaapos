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

const modalEl = document.getElementById('modalCustomer');
const form = document.getElementById('formCustomer');
const modal = new bootstrap.Modal(modalEl);
const tableBody = document.getElementById('customerTableBody');
const typeSelect = form.querySelector('[name="type"]');

const memberFields = ['#memberFields', '#memberFieldsDiskon', '#memberFieldsPoin']
    .map(id => document.querySelector(id));

let currentSearch = '';
let currentType = '';
let currentStatus = '';

function toggleMemberFields(isMember) {
    memberFields.forEach(el => el.classList.toggle('d-none', !isMember));
}

let currentLimit = 10;

const limitSelect = document.getElementById('limitSelect');

// Atur nilai awal dari select (supaya sinkron dengan currentLimit)
limitSelect.value = currentLimit;

// Event saat user ubah jumlah data per halaman
limitSelect.addEventListener('change', () => {
    currentLimit = parseInt(limitSelect.value);
    loadCustomers(1, currentLimit);
});

let currentSort = 'name';
let currentOrder = 'ASC'; // atau 'DESC'

function loadCustomers(page = 1, limit = currentLimit) {
    const params = new URLSearchParams({
        page,
        limit,
        search: currentSearch,
        type: currentType,
        status: currentStatus,
        sort: currentSort,
        order: currentOrder,
    });

    fetch(`/customers/list?${params}`)
        .then(res => res.json())
        .then(({
            data,
            pagination
        }) => {
            renderCustomerTable(data);
            renderPagination(pagination);
        });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    loadCustomers(1, currentLimit);
});

document.getElementById('filterType').addEventListener('change', (e) => {
    currentType = e.target.value;
    loadCustomers(1, currentLimit);
});

document.getElementById('filterStatus').addEventListener('change', (e) => {
    currentStatus = e.target.value;
    loadCustomers(1, currentLimit);
});

document.getElementById('btnResetFilter').addEventListener('click', () => {
    // Reset nilai state
    currentSearch = '';
    currentType = '';
    currentStatus = '';
    currentSort = 'createdAt';
    currentOrder = 'DESC';

    // Reset UI input/select
    document.getElementById('searchInput').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStatus').value = '';

    // Reset ikon sort
    updateSortIcons();

    // Reload data dari awal
    loadCustomers(1, currentLimit);
});

function renderCustomerTable(customers) {
    tableBody.innerHTML = '';
    customers.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${c.name}</td>
      <td>
        ${c.type === 'member'
          ? `<span class="badge bg-primary">Member</span><br><small class="text-muted">Sejak ${c.memberSince ? new Date(c.memberSince).toLocaleDateString('id-ID') : '-'}</small>`
          : `<span class="badge bg-secondary">Umum</span>`}
      </td>
      <td>${c.email || '-'}<br><small>${c.phone || '-'}</small></td>
      <td>${new Date(c.createdAt).toLocaleDateString('id-ID')}</td>
      <td><span class="badge bg-${c.status === 'active' ? 'success' : 'danger'}">${c.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
      <td class="text-center">
        <button class="btn btn-sm btn-warning me-1 btn-edit" 
          data-customer='${btoa(JSON.stringify(c))}'><i class="bx bx-edit"></i></button>
        <button class="btn btn-sm btn-danger btn-delete" 
          data-id="${c.id}" data-name="${c.name}"><i class="bx bx-trash"></i></button>
      </td>`;
        tableBody.appendChild(row);
    });

    initEditButtons();
    initDeleteButtons();
}


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

    e.preventDefault();

    const page = parseInt(link.dataset.page);
    if (!isNaN(page)) {
        loadCustomers(page, currentLimit); // GANTI sesuai function customer
    }
});

const sortByNameEl = document.getElementById('sortByName');
const sortByTypeEl = document.getElementById('sortByType');
const sortIcon = document.getElementById('sortIcon');
const typeSortIcon = document.getElementById('typeSortIcon');

sortByNameEl.addEventListener('click', () => {
    if (currentSort === 'name') {
        currentOrder = (currentOrder === 'ASC') ? 'DESC' : 'ASC';
    } else {
        currentSort = 'name';
        currentOrder = 'ASC';
    }
    loadCustomers(1, currentLimit);
    updateSortIcons();
});

sortByTypeEl.addEventListener('click', () => {
    if (currentSort === 'type') {
        currentOrder = (currentOrder === 'ASC') ? 'DESC' : 'ASC';
    } else {
        currentSort = 'type';
        currentOrder = 'ASC';
    }
    loadCustomers(1, currentLimit);
    updateSortIcons();
});

function updateSortIcons() {
    // Nama
    if (sortIcon) {
        sortIcon.className = 'bx ' + (
            currentSort === 'name' ?
            (currentOrder === 'ASC' ? 'bx-sort-down' : 'bx-sort-up') :
            'bx bx-sort-alt-2'
        );
    }

    // Jenis
    if (typeSortIcon) {
        typeSortIcon.className = 'bx ' + (
            currentSort === 'type' ?
            (currentOrder === 'ASC' ? 'bx-sort-down' : 'bx-sort-up') :
            'bx bx-sort-alt-2'
        );
    }
}

function initEditButtons() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = JSON.parse(atob(btn.dataset.customer));
            form.action = `/customers/${data.id}/update`;

            for (const key in data) {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = data[key] ?? '';
            }

            toggleMemberFields(data.type === 'member');
            const title = modalEl.querySelector('.modal-title');
            if (title) title.textContent = 'Edit Customer';
            modal.show();
        });
    });
}

function initDeleteButtons() {
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
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
                    loadCustomers(); 
                } else {
                    showToast({
                        title: 'Gagal',
                        message: result.message,
                        type: 'danger'
                    });
                }
            } catch (err) {
                showToast({
                    title: 'Error',
                    message: 'Gagal menghapus customer',
                    type: 'danger'
                });
            }
        });
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(form).entries());
    const isEdit = form.action.includes('/update');
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
            modal.hide();
            resetModalForm(form, {
                defaultAction: '/customers',
                hideFields: memberFields.map(el => `#${el.id}`)
            });
            showToast({
                title: 'Berhasil',
                message: result.message,
                type: 'success'
            });
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
            message: 'Kesalahan server',
            type: 'danger'
        });
    }
});

modalEl.addEventListener('shown.bs.modal', () => {
    const inputName = form.querySelector('[name="name"]');
    if (inputName) inputName.focus();
});

typeSelect.addEventListener('change', () => {
    toggleMemberFields(typeSelect.value === 'member');
});

modalEl.addEventListener('hidden.bs.modal', () => {
    resetModalForm(modalEl, {
        defaultAction: '/customers',
        hideFields: memberFields.map(el => `#${el.id}`),
        title: 'Tambah Customer'
    });
});

loadCustomers(); 
