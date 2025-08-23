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

const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const modalCreate = document.getElementById('modalCreate');
const formCreate = document.getElementById('formCreateProduct');
const tbody = document.getElementById('productTableBody');
const scrollContainer = document.getElementById('tableScrollContainer');
const modalEdit = document.getElementById('modalEdit');
const formEdit = document.getElementById('formEditProduct');
const createFileInput = document.getElementById('productImage');
const createPreviewEl = document.getElementById('createProductPreview');

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

// Saat klik Edit
tbody.addEventListener('click', async (e) => {
    if (e.target.closest('.btn-edit')) {
        const row = e.target.closest('tr');
        const productId = row.dataset.id;
        if (!productId) return;

        try {
            const res = await fetch(`/products/json/${productId}`);
            if (!res.ok) throw new Error('Failed to fetch product data');
            const product = await res.json();

            // Set form action untuk submit PUT
            formEdit.action = `/products/${productId}`;
            formEdit.reset();

            // Isi semua field...
            document.getElementById('editInputName').value = product.name || '';
            document.getElementById('editCategorySelect').value = product.categoryId || '';
            document.getElementById('editProductCode').value = product.code || '';
            document.getElementById('editInputBarcode').value = product.barcode || '';
            document.getElementById('editUnit').value = product.unit || '';
            document.getElementById('editSupplierSelect').value = product.supplierId || '';
            document.getElementById('editDefaultQty').checked = !!product.defaultQty;
            document.getElementById('editIsService').checked = !!product.service;
            document.getElementById('editProductType').value = product.type;
            document.getElementById('editInputCost').value = product.cost ?? '';
            document.getElementById('editInputMarkup').value = product.markup ?? '';
            document.getElementById('editInputSalePrice').value = product.salePrice || '';
            document.getElementById('editPriceChangeAllowed').checked = !!product.priceChangeAllowed;
            document.getElementById('editReorderPoint').value = product.reorderPoint || '';
            document.getElementById('editPreferredQty').value = product.preferredQty || '';
            document.getElementById('editEnableLowStockWarning').checked = !!product.lowStockWarning;
            document.getElementById('editLowStockWarning').value = product.lowStockThreshold || '';
            document.getElementById('editLowStockWarning').disabled = !product.lowStockWarning;
            document.getElementById('editEnableInputTax').checked = !!product.enableInputTax;
            document.getElementById('editTax').value = product.tax || '';
            document.getElementById('editTax').disabled = !product.enableInputTax;
            document.getElementById('editEnableAltDesc').checked = !!product.enableAltDesc;

            // Preview image lama
            const previewEl = document.getElementById('editProductPreview');
            if (product.image) {
                previewEl.src = product.image;
                previewEl.style.display = 'block';
            } else {
                previewEl.src = '';
                previewEl.style.display = 'none';
            }

            // Event listener untuk update preview saat pilih gambar baru
            const fileInput = document.getElementById('editProductImage');
            fileInput.addEventListener('change', function () {
                if (this.files && this.files[0]) {
                    previewEl.src = URL.createObjectURL(this.files[0]);
                    previewEl.style.display = 'block';
                } else {
                    previewEl.src = product.image || '';
                    previewEl.style.display = product.image ? 'block' : 'none';
                }
            });

            setupEditMarkupSalePriceHandlers();
            // Jalankan handler untuk sembunyikan field sesuai type
            const typeSelect = {
                value: product.type
            };
            handleProductTypeChange(typeSelect, 'edit');

            bootstrap.Modal.getOrCreateInstance(modalEdit).show();

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

function handleProductTypeChange(typeSelect, context = 'create') {
    const costInput = document.getElementById(context === 'create' ? 'inputCost' : 'editInputCost');
    const markupInput = document.getElementById(context === 'create' ? 'inputMarkup' : 'editInputMarkup');
    const salePriceInput = document.getElementById(context === 'create' ? 'inputSalePrice' : 'editInputSalePrice');
    const stockSection = document.getElementById(context === 'create' ? 'stockSectionCreate' : 'stockSectionEdit');
    const serviceCheckbox = document.getElementById(context === 'create' ? 'isService' : 'editIsService');
    const priceChangeAllowed = document.getElementById(context === 'create' ? 'priceChangeAllowed' : 'editPriceChangeAllowed');
    const lowStockWarning = document.getElementById(context === 'create' ? 'enableLowStockWarning' : 'editEnableLowStockWarning');
    const inputLowStockWarning = document.getElementById(context === 'create' ? 'lowStockWarning' : 'editLowStockWarning');
    const taxCheckbox = document.getElementById(context === 'create' ? 'enableInputTax' : 'editEnableInputTax');
    const taxInput = document.getElementById(context === 'create' ? 'tax' : 'editTax');

    if (typeSelect.value === 'ppob') {
        // hide / disable untuk PPOB
        costInput.closest('.col-md-4').style.display = 'none';
        markupInput.closest('.col-md-4').style.display = 'none';
        salePriceInput.closest('.col-md-4').style.display = 'none';

        costInput.required = false;
        markupInput.required = false;
        salePriceInput.required = false;

        if (stockSection) stockSection.style.display = 'none';

        serviceCheckbox.checked = false;
        serviceCheckbox.disabled = true;

        // PPOB selalu bisa ubah harga di POS
        priceChangeAllowed.checked = true;
        priceChangeAllowed.disabled = true;

        // Pajak optional, default disable
        lowStockWarning.checked = false;
        lowStockWarning.disabled = true;
        inputLowStockWarning.value = '';
        inputLowStockWarning.disabled = true;

        // Pajak optional, default disable
        taxCheckbox.checked = false;
        taxCheckbox.disabled = true;
        taxInput.value = '';
        taxInput.disabled = true;
    } else {
        // kembali normal (fisik)
        costInput.closest('.col-md-4').style.display = '';
        markupInput.closest('.col-md-4').style.display = '';
        salePriceInput.closest('.col-md-4').style.display = '';

        costInput.required = true;
        markupInput.required = true;
        salePriceInput.required = true;
        
        if (stockSection) stockSection.style.display = '';

        serviceCheckbox.disabled = false;
        priceChangeAllowed.disabled = false;
        lowStockWarning.disabled = false;
        taxCheckbox.disabled = false;
    }
}

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

    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    const formData = new FormData(formEdit);

    // Checkbox → Boolean
    formData.set('defaultQty', formData.get('defaultQty') === 'on');
    formData.set('service', formData.get('isService') === 'on');
    formData.set('priceChangeAllowed', formData.get('priceChangeAllowed') === 'on');
    formData.set('enableLowStockWarning', formData.get('enableLowStockWarning') === 'on');
    formData.set('enableInputTax', formData.get('enableInputTax') === 'on');
    formData.set('enableAltDesc', formData.get('enableAltDesc') === 'on');

    try {
        const res = await fetch(formEdit.action, {
            method: 'PUT',
            headers: {
                'CSRF-Token': csrfToken 
            },
            body: formData
        });

        const result = await res.json();
        if (res.ok && result.success) {
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: 'Produk berhasil diupdate'
            });
            bootstrap.Modal.getInstance(modalEdit).hide();

            offset = 0;
            done = false;
            tbody.innerHTML = '';
            await loadMoreProducts();
        } else {
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

document.getElementById('productType')?.addEventListener('change', function () {
    handleProductTypeChange(this, 'create');
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

if (createFileInput) {
    createFileInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            createPreviewEl.src = URL.createObjectURL(this.files[0]);
            createPreviewEl.style.display = 'block';
        } else {
            createPreviewEl.src = '';
            createPreviewEl.style.display = 'none';
        }
    });
}

formCreate.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formCreate);

    // kalau mau set nilai boolean secara manual:
    formData.set('defaultQty', formData.get('defaultQty') === 'on');
    formData.set('service', formData.get('isService') === 'on');
    formData.set('priceChangeAllowed', formData.get('priceChangeAllowed') === 'on');

    try {
        const res = await fetch('/products', {
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken // jangan set Content-Type manual
            },
            body: formData
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

    // Reset image preview
    if (createPreviewEl) {
        createPreviewEl.src = '';
        createPreviewEl.style.display = 'none';
    }

    // Reset file input
    if (createFileInput) createFileInput.value = '';

    // Reset Product Type ke default (fisik)
    const typeSelect = document.getElementById('productType');
    if (typeSelect) {
        typeSelect.value = 'fisik'; // default ke fisik
        handleProductTypeChange(typeSelect, 'create');
    }
});


modalEdit.addEventListener('hidden.bs.modal', () => {
    resetInputErrors(formEdit);

    // Reset image preview
    const editPreviewEl = document.getElementById('editProductPreview');
    const editFileInput = document.getElementById('editProductImage');
    if (editPreviewEl) {
        editPreviewEl.src = '';
        editPreviewEl.style.display = 'none';
    }
    if (editFileInput) editFileInput.value = '';
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
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
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
            body: formData,
            credentials: 'same-origin'
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
