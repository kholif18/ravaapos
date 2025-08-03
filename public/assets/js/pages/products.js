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
    showInputErrors,
    resetInputErrors
} from '/assets/js/utils/formError.js';


const modalCreate = document.getElementById('modalCreate');
const formCreate = document.getElementById('formCreateProduct');
const tbody = document.getElementById('productTableBody');
const scrollContainer = document.getElementById('tableScrollContainer');

let currentSearch = '';
let offset = 0;
const limit = 25;
let loading = false;
let done = false;
let totalProductCount = 0;

async function loadMoreProducts() {
    if (loading || done) return;
    loading = true;
    document.getElementById('loadingIndicator').textContent = 'Loading...';

    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || '';
    const search = currentSearch || '';

    try {
        const res = await fetch(`/products/json?offset=${offset}&limit=${limit}&category=${category}&q=${search}`);
        const {
            products,
            total
        } = await res.json();

        if (offset === 0) {
            totalProductCount = total;
            document.getElementById('totalProductCount').textContent = total;
        }

        if (products.length < limit) done = true;
        offset += products.length;

        const fragment = document.createDocumentFragment();
        for (const product of products) {
            const row = document.createElement('tr');
            row.dataset.id = product.id;
            row.innerHTML = `
          <td data-column="code">${product.code}</td>
          <td data-column="name">${product.name}</td>
          <td data-column="category">${product.category?.name || '-'}</td>
          <td data-column="barcode">${product.barcode || '-'}</td>
          <td data-column="cost" data-value="${product.cost}">Rp ${Number(product.cost).toLocaleString('id-ID')}</td>
          <td data-column="salePrice" data-value="${product.salePrice}">Rp ${Number(product.salePrice).toLocaleString('id-ID')}</td>
          <td data-column="unit">${product.unit}</td>
          <td>
            <button class="btn btn-sm btn-warning btn-edit" data-bs-toggle="modal" data-bs-target="#modalEdit"><i class="bx bx-edit"></i></button>
            <button class="btn btn-sm btn-danger btn-delete"><i class="bx bx-trash"></i></button>
          </td>`;
            fragment.appendChild(row);
        }
        tbody.appendChild(fragment);

        document.getElementById('loadingIndicator').textContent = done ? 'Semua Product dimuat' : '';
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data.'
        });
    } finally {
        loading = false;
    }
}

document.getElementById('searchProduct')?.addEventListener('input', async e => {
    currentSearch = e.target.value.trim();
    offset = 0;
    done = false;
    tbody.innerHTML = '';
    await loadMoreProducts();
});

const inputCost = document.getElementById('inputCost');
const inputMarkup = document.getElementById('inputMarkup');
const inputSalePrice = document.getElementById('inputSalePrice');
const checkboxService = document.getElementById('isService');

let lastChanged = null;

function updateSalePrice() {
    if (lastChanged === 'sale') return;
    const cost = parseFloat(inputCost.value) || 0;
    const markup = parseFloat(inputMarkup.value) || 0;
    const sale = cost + (cost * markup / 100);
    lastChanged = 'markup';
    inputSalePrice.value = Number.isInteger(sale) ? sale : sale.toFixed(2);
}

function updateMarkup() {
    if (lastChanged === 'markup') return;
    const cost = parseFloat(inputCost.value) || 0;
    const sale = parseFloat(inputSalePrice.value) || 0;
    if (cost === 0) return;
    const markup = ((sale - cost) / cost) * 100;
    lastChanged = 'sale';
    inputMarkup.value = Number.isInteger(markup) ? markup : markup.toFixed(2);
}

inputCost?.addEventListener('input', () => {
    lastChanged = null;
    updateSalePrice();
});
inputMarkup?.addEventListener('input', () => {
    lastChanged = null;
    updateSalePrice();
});
inputSalePrice?.addEventListener('input', () => {
    lastChanged = null;
    updateMarkup();
});

document.getElementById('enableLowStockWarning').addEventListener('change', function () {
    document.getElementById('lowStockWarning').disabled = !this.checked;
});

checkboxService?.addEventListener('change', () => {
    const isService = checkboxService.checked;

    if (isService) {
        if (!inputCost.value) inputCost.value = '0';
        inputMarkup.value = '';
    }
});

document.getElementById('categorySelect').addEventListener('change', async function () {
    const categoryId = this.value;
    if (!categoryId) return;

    try {
        const res = await fetch(`/products/generate-code?categoryId=${categoryId}`);
        const data = await res.json();
        if (data.code) {
            document.getElementById('productCode').value = data.code;
        }
    } catch (err) {
        console.error('Gagal generate kode:', err);
    }
});

scrollContainer.addEventListener('scroll', () => {
    if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10) {
        loadMoreProducts();
    }
});

formCreate.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formCreate);
    const data = Object.fromEntries(formData.entries());

    data.defaultQty = formData.get('defaultQty') === 'on';
    data.service = formData.get('isService') === 'on';
    data.priceChangeAllowed = formData.get('priceChangeAllowed') === 'on';

    try {
        const res = await fetch('/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok && result.success) {
            bootstrap.Modal.getInstance(modalCreate).hide();
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: 'Product berhasil ditambahkan'
            });

            offset = 0;
            done = false;
            tbody.innerHTML = '';
            await loadMoreProducts();
            resetModalForm(modalCreate, {
                defaults: {
                    defaultQty: true
                }
            });
        } else {
            if (result.errors) {
                showInputErrors(result.errors, formCreate);
            } else {
                showToast({
                    type: 'danger',
                    title: 'Gagal',
                    message: result.message
                });
            }
        }
    } catch (err) {
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal menyimpan data.'
        });
    }
});

modalCreate.addEventListener('hidden.bs.modal', () => {
    resetModalForm(modalCreate, {
        defaults: {
            defaultQty: true
        }
    });
    resetInputErrors(formCreate);
});

modalCreate.addEventListener('shown.bs.modal', () => {
    modalCreate.querySelector('[name="name"]')?.focus();
});

function sortTableBy(column, ascending = true) {
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const aCell = a.querySelector(`td[data-column="${column}"]`);
        const bCell = b.querySelector(`td[data-column="${column}"]`);

        let aVal = aCell?.dataset.value || aCell?.textContent?.trim() || '';
        let bVal = bCell?.dataset.value || bCell?.textContent?.trim() || '';

        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return ascending ? aNum - bNum : bNum - aNum;
        }

        return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

function updateSortIcons(column, ascending) {
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.className = 'sort-icon bx';
    });

    const iconEl = document.querySelector(`th[data-sort="${column}"] .sort-icon`);
    if (iconEl) {
        iconEl.classList.add(ascending ? 'bx-sort-down' : 'bx-sort-up');
    }
}

const headers = document.querySelectorAll('#productTable thead th[data-sort]');
let currentSort = {
    column: null,
    ascending: true
};

headers.forEach(header => {
    header.addEventListener('click', () => {
        const column = header.dataset.sort;
        const ascending = (currentSort.column === column) ? !currentSort.ascending : true;
        currentSort = {
            column,
            ascending
        };
        sortTableBy(column, ascending);
        updateSortIcons(column, ascending);
    });
});


// Delete
tbody.addEventListener('click', async function (e) {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;

    const row = btn.closest('tr');
    const productId = row.dataset.id;

    const confirmed = await confirmDelete('Product ini akan dihapus dan tidak bisa dikembalikan.');

    if (!confirmed) return;

    try {
        const res = await fetch(`/products/${productId}/delete`, {
            method: 'POST'
        });
        const result = await res.json();

        if (res.ok && result.success) {
            row.remove();
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: result.message
            });
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
            message: 'Gagal menghapus Product.'
        });
    }
});

loadMoreProducts();
