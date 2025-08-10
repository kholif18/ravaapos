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
const modalEdit = document.getElementById('modalEdit');
const formEdit = document.getElementById('formEditProduct');

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
    const supplierId = params.get('supplierId') || '';
    const type = params.get('type') || '';
    const search = currentSearch || '';

    try {
        const res = await fetch(`/products/json?offset=${offset}&limit=${limit}&category=${category}&supplierId=${supplierId}&type=${type}&q=${search}`);
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
          <td data-column="supplier">${product.supplier?.name || '-'}</td>
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

tbody.addEventListener('click', async (e) => {
    if (e.target.closest('.btn-edit')) {
        const row = e.target.closest('tr');
        const productId = row.dataset.id;
        if (!productId) return;

        try {
            const res = await fetch(`/products/json/${productId}`);
            if (!res.ok) throw new Error('Failed to fetch product data');
            const product = await res.json();

            formEdit.action = `/products/${productId}`;
            formEdit.reset();

            document.getElementById('editInputName').value = product.name || '';
            document.getElementById('editCategorySelect').value = product.categoryId || '';
            document.getElementById('editProductCode').value = product.code || '';
            document.getElementById('editInputBarcode').value = product.barcode || '';
            document.getElementById('editUnit').value = product.unit || '';
            document.getElementById('editSupplierSelect').value = product.supplierId || '';
            document.getElementById('editDefaultQty').checked = !!product.defaultQty;
            document.getElementById('editIsService').checked = !!product.service;
            document.getElementById('editInputCost').value = (typeof product.cost === 'number') ? product.cost : '';
            document.getElementById('editInputMarkup').value = (typeof product.markup === 'number') ? product.markup : '';
            document.getElementById('editInputSalePrice').value = product.salePrice || '';
            document.getElementById('editPriceChangeAllowed').checked = !!product.priceChangeAllowed;
            document.getElementById('editReorderPoint').value = product.reorderPoint || '';
            document.getElementById('editPreferredQty').value = product.preferredQty || '';
            document.getElementById('editEnableLowStockWarning').checked = !!product.enableLowStockWarning;
            document.getElementById('editLowStockWarning').value = product.lowStockThreshold || '';
            document.getElementById('editLowStockWarning').disabled = !product.enableLowStockWarning;
            document.getElementById('editEnableInputTax').checked = !!product.enableInputTax;
            document.getElementById('editTax').value = product.tax || '';
            document.getElementById('editTax').disabled = !product.enableInputTax;
            document.getElementById('editEnableAltDesc').checked = !!product.enableAltDesc;

            setupEditMarkupSalePriceHandlers();

            // Tampilkan modal edit
            const bsModalEdit = bootstrap.Modal.getOrCreateInstance(modalEdit);
            bsModalEdit.show();
        } catch (err) {
            console.error(err);
            showToast({
                type: 'danger',
                title: 'Error',
                message: 'Gagal mengambil data produk'
            });
        }
    }
});

function setupEditMarkupSalePriceHandlers() {
    const editInputCost = document.getElementById('editInputCost');
    const editInputMarkup = document.getElementById('editInputMarkup');
    const editInputSalePrice = document.getElementById('editInputSalePrice');
    const editCheckboxService = document.getElementById('editIsService');

    let editLastChanged = null;

    function editUpdateSalePrice() {
        if (editLastChanged === 'sale') return;
        const cost = parseFloat(editInputCost.value) || 0;
        const markup = parseFloat(editInputMarkup.value) || 0;
        const sale = cost + (cost * markup / 100);
        editLastChanged = 'markup';
        editInputSalePrice.value = Number.isInteger(sale) ? sale : sale.toFixed(2);
    }

    function editUpdateMarkup() {
        if (editLastChanged === 'markup') return;
        const cost = parseFloat(editInputCost.value) || 0;
        const sale = parseFloat(editInputSalePrice.value) || 0;
        if (cost === 0) return;
        const markup = ((sale - cost) / cost) * 100;
        editLastChanged = 'sale';
        editInputMarkup.value = Number.isInteger(markup) ? markup : markup.toFixed(2);
    }

    editInputCost?.addEventListener('input', () => {
        editLastChanged = null;
        editUpdateSalePrice();
    });
    editInputMarkup?.addEventListener('input', () => {
        editLastChanged = null;
        editUpdateSalePrice();
    });
    editInputSalePrice?.addEventListener('input', () => {
        editLastChanged = null;
        editUpdateMarkup();
    });

    editCheckboxService?.addEventListener('change', () => {
        const isService = editCheckboxService.checked;
        if (isService) {
            if (!editInputCost.value) editInputCost.value = '0';
            editInputMarkup.value = '';
        }
    });
}

formEdit.addEventListener('submit', async (e) => {
    e.preventDefault();

    resetInputErrors(formEdit);

    const formData = new FormData(formEdit);
    const data = Object.fromEntries(formData.entries());

    // Konversi boolean untuk checkbox
    data.defaultQty = formData.get('defaultQty') === 'on';
    data.isService = formData.get('isService') === 'on'; // sesuaikan key sesuai input name
    data.priceChangeAllowed = formData.get('priceChangeAllowed') === 'on';
    data.enableLowStockWarning = formData.get('enableLowStockWarning') === 'on';
    data.enableInputTax = formData.get('enableInputTax') === 'on';
    data.enableAltDesc = formData.get('enableAltDesc') === 'on';

    // Ambil id dari form action (url /products/:id)
    const url = new URL(formEdit.action, window.location.origin);

    try {
        const res = await fetch(url.pathname, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok && result.success) {
            // Berhasil update
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: 'Produk berhasil diupdate'
            });
            bootstrap.Modal.getInstance(modalEdit).hide();

            // Refresh list / reload produk
            offset = 0;
            done = false;
            tbody.innerHTML = '';
            await loadMoreProducts();
        } else {
            // Tampilkan error validasi jika ada
            if (result.errors) {
                showInputErrors(result.errors, formEdit);
            } else {
                showToast({
                    type: 'danger',
                    title: 'Gagal',
                    message: result.message || 'Gagal mengupdate produk'
                });
            }
        }
    } catch (err) {
        console.error(err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal mengirim data ke server'
        });
    }
});

document.getElementById('searchProduct')?.addEventListener('input', async e => {
    currentSearch = e.target.value.trim();
    offset = 0;
    done = false;
    tbody.innerHTML = '';
    await loadMoreProducts();
});

function generateBarcode(length = 12) {
    let barcode = '';
    for (let i = 0; i < length; i++) {
        barcode += Math.floor(Math.random() * 10); // angka 0–9
    }
    return barcode;
}

// Tombol generate barcode modal create
document.getElementById('btnGenerateBarcode')?.addEventListener('click', () => {
    const barcode = generateBarcode();
    document.getElementById('inputBarcode').value = barcode;
});

// Tombol generate barcode modal edit, samakan dengan create
document.getElementById('btnGenerateEditBarcode').addEventListener('click', () => {
    const barcode = generateBarcode();
    document.getElementById('editInputBarcode').value = barcode;
});

// Enable/disable input dependent on switches in edit modal:
document.getElementById('editEnableLowStockWarning').addEventListener('change', e => {
    document.getElementById('editLowStockWarning').disabled = !e.target.checked;
});
document.getElementById('editEnableInputTax').addEventListener('change', e => {
    document.getElementById('editTax').disabled = !e.target.checked;
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

document.getElementById('enableInputTax').addEventListener('change', function () {
    const input = document.getElementById('tax');
    if (this.checked) {
        input.disabled = false;
    } else {
        input.disabled = true;
        input.value = ''; // kosongkan agar tidak terkirim
    }
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

    const categorySelect = document.getElementById('categorySelect');
    categorySelect.dispatchEvent(new Event('change'));
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

document.querySelector('#modalImportCSV form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const btnSubmit = form.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Importing...';

    try {
        const res = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        const result = await res.json();

        if (result.success) {
            alert('Import berhasil!');
            form.reset();
            bootstrap.Modal.getInstance(document.getElementById('modalImportCSV')).hide();
        } else {
            let msg = result.message || 'Periksa format file.';
            if (result.errors && Array.isArray(result.errors)) {
                msg += '\n\nDetail error:\n';
                result.errors.forEach(e => {
                    msg += `Baris ${e.row}: ${e.message}\n`;
                });
            }
            alert('Gagal import: ' + msg);
        }
    } catch (err) {
        alert('Error saat upload file.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Import';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const getFilterParams = () => {
        // Ambil parameter filter dari form (sesuai query di controller viewProducts)
        const search = document.getElementById('searchProduct')?.value || '';
        const category = document.querySelector('select[name="category"]')?.value || '';
        const supplierId = document.querySelector('select[name="supplierId"]')?.value || '';
        const type = document.querySelector('select[name="type"]')?.value || '';

        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (category) params.append('category', category);
        if (supplierId) params.append('supplierId', supplierId);
        if (type) params.append('type', type);

        return params.toString();
    };

    // Export CSV
    const btnExportCSV = document.getElementById('btnExportCSV');
    btnExportCSV?.addEventListener('click', () => {
        const query = getFilterParams();
        window.open(`/products/export/csv?${query}`, '_blank');
    });

    // Export PDF
    const btnExportPDF = document.getElementById('btnExportPDF'); // misal tombol export PDF ada id ini

    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', () => {
            const search = document.getElementById('searchProduct')?.value || '';
            const category = document.getElementById('categoryFilter')?.value || '';
            const supplierId = document.getElementById('supplierFilter')?.value || '';
            const type = document.getElementById('typeFilter')?.value || '';

            const params = new URLSearchParams({
                search,
                category,
                supplierId,
                type
            }).toString();

            window.open(`/products/export/pdf?${params}`, '_blank');
        });
    }
    
    // Print
    document.getElementById('btnPrint').addEventListener('click', e => {
        e.preventDefault();
        const query = getFilterParams(); // kalau ada filter pencarian
        window.open(`/products/print?${query}`, '_blank');
    });
});


loadMoreProducts();
