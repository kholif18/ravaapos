import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    resetModalForm
} from '/assets/js/utils/resetModal.js';

const tbody = document.getElementById('stockTbody');
const searchInput = document.getElementById('searchProduct');
const categoryFilter = document.getElementById('categoryFilter');
const resetButton = document.getElementById('resetFilters');
const filterNegative = document.getElementById('filterNegative');
const filterZero = document.getElementById('filterZero');
const filterNonZero = document.getElementById('filterNonZero');

let currentPage = 1;
let stockFilter = '';
let loading = false;

// === HELPER ===
function reloadRow(id) {
    return fetch(`/stock/partial?id=${id}`)
        .then(res => res.text())
        .then(rowHTML => {
            const oldRow = tbody.querySelector(`button[data-id="${id}"]`)?.closest('tr');
            if (oldRow) oldRow.outerHTML = rowHTML;
        });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    new bootstrap.Modal(modal).show();
}

function getFloatValue(id) {
    return parseFloat(document.getElementById(id).value) || 0;
}

// === UTILS ===
function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

// === FETCH DATA ===
function getParams() {
    return new URLSearchParams({
        page: currentPage,
        categoryId: categoryFilter.value,
        search: searchInput.value.trim(),
        filter: stockFilter
    });
}

async function loadProducts({
    append = false
} = {}) {
    const res = await fetch(`/stock/partial?${getParams()}`);
    const html = await res.text();

    if (append) {
        tbody.insertAdjacentHTML('beforeend', html);
    } else {
        tbody.innerHTML = html;
        currentPage = 1;
    }

    updateBadges();
}

async function updateBadges() {
    const params = new URLSearchParams({
        categoryId: categoryFilter.value,
        search: searchInput.value.trim()
    });

    try {
        const res = await fetch(`/stock/summary?${params}`);
        const data = await res.json();

        document.getElementById('badgeNegative').textContent = data.negative;
        document.getElementById('badgeZero').textContent = data.zero;
        document.getElementById('badgePositive').textContent = data.positive;
    } catch (err) {
        console.error("Gagal update ringkasan stok:", err);
    }
}

// === EVENT LISTENER ===
categoryFilter.addEventListener('change', () => {
    currentPage = 1;
    loadProducts();
});

searchInput.addEventListener('input', debounce(() => {
    currentPage = 1;
    loadProducts();
}, 400));

[filterNegative, filterZero, filterNonZero].forEach(btn => {
    btn.addEventListener('click', () => {
        stockFilter = btn.id.replace('filter', '').toLowerCase();
        currentPage = 1;
        loadProducts();
    });
});

resetButton.addEventListener('click', () => {
    categoryFilter.value = '';
    searchInput.value = '';
    stockFilter = '';
    currentPage = 1;
    loadProducts();
});

// === INFINITE SCROLL ===
window.addEventListener('scroll', () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    if (nearBottom && !loading) {
        loading = true;
        currentPage++;
        loadProducts({
            append: true
        }).finally(() => loading = false);
    }
});

// === QUICK ADD STOCK ===
tbody.addEventListener('click', (e) => {
    if (e.target.closest('.btn-add-stock')) {
        const id = e.target.closest('button').dataset.id;
        const modal = document.getElementById('modalStockAdd');

        // Reset form saat sebelum show
        resetModalForm(modal, {
            title: 'Tambah Stok',
            hideFields: [] // kalau ada yang perlu disembunyikan
        });

        document.getElementById('productIdStock').value = id;

        showModal('modalStockAdd');
    }
});

document.getElementById('modalStockAdd').addEventListener('hidden.bs.modal', () => {
    resetModalForm(document.getElementById('modalStockAdd'));
});

// autofocus
const modalStockAdd = document.getElementById('modalStockAdd');

modalStockAdd.addEventListener('shown.bs.modal', () => {
    document.getElementById('addQty').focus();
});

const modalStockAdjust = document.getElementById('modalStockAdjust');

modalStockAdjust.addEventListener('shown.bs.modal', () => {
    document.getElementById('adjustQty').focus();
});

document.getElementById('formStockAdd').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productIdStock').value;
    const qty = getFloatValue('addQty');
    const note = document.getElementById('addNote').value;

    const res = await fetch(`/stock/${id}/add-stock`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            qty,
            note
        })
    });

    const data = await res.json();

    if (data.success) {
        showToast('success', data.message);
        bootstrap.Modal.getInstance(document.getElementById('modalStockAdd')).hide();

        await reloadRow(id);

        updateBadges();
    } else {
        showToast('error', data.message);
    }
});

// === TOOLTIP INIT ===
document.addEventListener('DOMContentLoaded', () => {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
    loadProducts(); // initial load
});

tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-adjust-stock');
    if (btn) {
        const id = btn.dataset.id;
        const currentQty = parseFloat(btn.dataset.stock) || 0;
        const modal = document.getElementById('modalStockAdjust');

        resetModalForm(modal, {
            title: 'Stock Opname'
        });

        document.getElementById('productIdAdjust').value = id;
        document.getElementById('currentQty').value = currentQty;
        document.getElementById('adjustQty').value = '';
        document.getElementById('qtyDiff').value = '';

        showModal('modalStockAdjust');
    }
});

// Kalkulasi selisih otomatis
document.getElementById('adjustQty').addEventListener('input', () => {
    const current = getFloatValue('currentQty');
    const real = getFloatValue('adjustQty');
    const diff = real - current;
    const qtyDiff = (diff > 0 ? '+' : '') + diff;
    document.getElementById('qtyDiff').value = qtyDiff;
});

document.getElementById('formStockAdjust').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productIdAdjust').value;
    const qty = getFloatValue('adjustQty');
    const note = document.getElementById('adjustNote').value;

    const res = await fetch(`/stock/${id}/adjust`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            qty,
            note
        })
    });

    const data = await res.json();

    if (data.success) {
        showToast('success', data.message);
        bootstrap.Modal.getInstance(document.getElementById('modalStockAdjust')).hide();

        // Reload 1 row
        await reloadRow(id);

        updateBadges();
    } else {
        showToast('error', data.message);
    }
});
