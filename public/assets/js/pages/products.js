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
import {
    PRODUCT_UI_RULES
} from './productUIRules.js';

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
    const requireQty = params.get('requireQty') || '';
    const priceChange = params.get('priceChange') || '';
    const altDesc = params.get('altDesc') || '';
    const search = currentSearch || '';

    try {
        const url = new URL('/products/json', window.location.origin);
        url.searchParams.set('offset', offset);
        url.searchParams.set('limit', limit);
        if (category) url.searchParams.set('category', category);
        if (supplierId) url.searchParams.set('supplierId', supplierId);
        if (type) url.searchParams.set('type', type);
        if (requireQty) url.searchParams.set('requireQty', requireQty);
        if (priceChange) url.searchParams.set('priceChange', priceChange);
        if (altDesc) url.searchParams.set('altDesc', altDesc);
        if (search) url.searchParams.set('q', search);


        const res = await fetch(url.toString());

        const data = await res.json();

        const {
            products,
            total
        } = data;

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

            // Tentukan badge untuk type produk
            let typeBadge = '';
            if (product.type === 'service') {
                typeBadge = '<span class="badge badge-xs bg-warning text-warning-emphasis border border-warning ms-1">SVC</span>';
            } else if (product.type === 'ppob') {
                typeBadge = '<span class="badge badge-xs bg-info text-info-emphasis border border-info ms-1">PPOB</span>';
            }

            row.innerHTML = `
                <td data-column="code">
                    ${escapeHtml(product.code)}
                    ${typeBadge}
                </td>

                <td data-column="name">
                    <div class="fw-semibold">
                        ${escapeHtml(product.name)}
                    </div>
                </td>

                <td data-column="category">
                    ${escapeHtml(product.category?.name || '-')}
                </td>

                <td data-column="barcode">
                    ${escapeHtml(product.barcode || '-')}
                </td>

                <td data-column="cost" data-value="${product.cost}">
                    Rp ${Number(product.cost || 0).toLocaleString('id-ID')}
                </td>

                <td data-column="salePrice" data-value="${product.salePrice}">
                    Rp ${Number(product.salePrice || 0).toLocaleString('id-ID')}
                </td>

                <td data-column="unit">
                    ${escapeHtml(product.unit || '-')}
                </td>

                <td data-column="supplier">
                    ${escapeHtml(product.supplier?.name || '-')}
                </td>

                <td class="text-nowrap">
                    <button class="btn btn-sm btn-icon btn-warning btn-edit"
                        data-bs-toggle="modal"
                        data-bs-target="#modalEdit">
                        <i class="bx bx-edit"></i>
                    </button>

                    <button class="btn btn-sm btn-icon btn-danger btn-delete">
                        <i class="bx bx-trash"></i>
                    </button>
                </td>
            `;
            fragment.appendChild(row);
        }
        tbody.appendChild(fragment);

        document.getElementById('loadingIndicator').textContent = done ? 'Semua Product dimuat' : '';
    } catch (err) {
        console.error('Error in loadMoreProducts:', err);
        showToast({
            type: 'danger',
            title: 'Error',
            message: 'Gagal memuat data: ' + err.message
        });
    } finally {
        loading = false;
    }
}

// Helper escapeHtml untuk keamanan
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sinkronkan nilai filter dari URL ke select elements
function syncFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    const type = params.get('type');
    if (type) {
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) typeFilter.value = type;
    }

    const requireQty = params.get('requireQty');
    if (requireQty) {
        const requireQtyFilter = document.getElementById('requireQtyFilter');
        if (requireQtyFilter) requireQtyFilter.value = requireQty;
    }

    const priceChange = params.get('priceChange');
    if (priceChange) {
        const priceChangeFilter = document.getElementById('priceChangeFilter');
        if (priceChangeFilter) priceChangeFilter.value = priceChange;
    }

    const altDesc = params.get('altDesc');
    if (altDesc) {
        const altDescFilter = document.getElementById('altDescFilter');
        if (altDescFilter) altDescFilter.value = altDesc;
    }

    const category = params.get('category');
    if (category) {
        const categoryFilter = document.querySelector('select[name="category"]');
        if (categoryFilter) categoryFilter.value = category;
    }

    const supplierId = params.get('supplierId');
    if (supplierId) {
        const supplierFilter = document.querySelector('select[name="supplierId"]');
        if (supplierFilter) supplierFilter.value = supplierId;
    }

    const search = params.get('q');
    if (search) {
        const searchInput = document.getElementById('searchProduct');
        if (searchInput) searchInput.value = search;
        currentSearch = search;
    }
}

// Filter Kategori
document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value) {
        params.set('category', e.target.value);
    } else {
        params.delete('category');
    }
    window.location.search = params.toString();
});

// Filter Supplier
document.getElementById('supplierFilter')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value) {
        params.set('supplierId', e.target.value);
    } else {
        params.delete('supplierId');
    }
    window.location.search = params.toString();
});

// Filter Tipe
document.getElementById('typeFilter')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value) {
        params.set('type', e.target.value);
    } else {
        params.delete('type');
    }
    window.location.search = params.toString();
});

// mengambil isi modal create
function handleProductTypeChange(typeSelect, context = 'create') {
    const costInput = document.getElementById(context === 'create' ? 'inputCost' : 'editInputCost');
    const markupInput = document.getElementById(context === 'create' ? 'inputMarkup' : 'editInputMarkup');
    const salePriceInput = document.getElementById(context === 'create' ? 'inputSalePrice' : 'editInputSalePrice');
    const stockSection = document.getElementById(context === 'create' ? 'stockSectionCreate' : 'stockSectionEdit');
    const requireQtyInput = document.getElementById(context === 'create' ? 'requireQtyInput' : 'editRequireQtyInput');
    const priceChangeAllowed = document.getElementById(context === 'create' ? 'priceChangeAllowed' : 'editPriceChangeAllowed');
    const reorderPointInput = document.getElementById(context === 'create' ? 'reorderPoint' : 'editReorderPoint');
    const preferredQtyInput = document.getElementById(context === 'create' ? 'preferredQty' : 'editPreferredQty');
    const lowStockWarning = document.getElementById(context === 'create' ? 'lowStockWarning' : 'editEnableLowStockWarning');
    const inputLowStockWarning = document.getElementById(context === 'create' ? 'lowStockThreshold' : 'editLowStockThreshold');
    const taxCheckbox = document.getElementById(context === 'create' ? 'enableInputTax' : 'editEnableInputTax');
    const taxInput = document.getElementById(context === 'create' ? 'tax' : 'editTax');

    if (typeSelect.value === 'ppob') {
        if (requireQtyInput) {
            requireQtyInput.checked = false;
            requireQtyInput.disabled = true;
        }
        if (priceChangeAllowed) {
            priceChangeAllowed.checked = true;
            priceChangeAllowed.disabled = true;
        }

        if (costInput) {
            toggleRequired(costInput, true);
        }

        if (markupInput) {
            toggleRequired(markupInput, true);
        }

        if (salePriceInput) {
            toggleRequired(salePriceInput, true);
        }

        if (stockSection) {
            stockSection.style.display = 'none';
        }

        if (reorderPointInput) {
            reorderPointInput.value = 0;
        }

        if (preferredQtyInput) {
            preferredQtyInput.value = 0;
            preferredQtyInput.disabled = true;
        }
        
        // Disable low stock warning untuk PPOB
        if (lowStockWarning) {
            lowStockWarning.checked = false;
            lowStockWarning.disabled = true;
        }

        if (inputLowStockWarning) {
            inputLowStockWarning.value = '';
            inputLowStockWarning.disabled = true;
        }

        // Tax optional, default disable untuk PPOB
        if (taxCheckbox) {
            taxCheckbox.checked = false;
            taxCheckbox.disabled = true;
        }
        if (taxInput) {
            taxInput.value = '';
            taxInput.disabled = true;
        }
    } else {
        // Kembalikan ke normal (fisik atau service)
        if (costInput) costInput.closest('.col-md-4').style.display = '';
        if (markupInput) markupInput.closest('.col-md-4').style.display = '';
        if (salePriceInput) salePriceInput.closest('.col-md-4').style.display = '';
        if (stockSection) stockSection.style.display = '';
        
        if (requireQtyInput) {
            requireQtyInput.disabled = false;
        }
        if (priceChangeAllowed) {
            priceChangeAllowed.disabled = false;
        }
        if (lowStockWarning) {
            lowStockWarning.disabled = false;
        }
        if (inputLowStockWarning) {
            inputLowStockWarning.disabled = !lowStockWarning.checked;
        }
        if (taxCheckbox) {
            taxCheckbox.disabled = false;
        }

        if (taxInput) {
            taxInput.disabled = !taxCheckbox.checked;
        }

        toggleRequired(costInput, true);
        toggleRequired(markupInput, true);
        toggleRequired(salePriceInput, true);
    }

    // Untuk service, stok bisa 0 atau tidak diurus
    if (typeSelect.value === 'service') {
        if (stockSection) {
            stockSection.style.display = 'none';
        }

        if (reorderPointInput) {
            reorderPointInput.value = 0;
        }

        if (preferredQtyInput) {
            preferredQtyInput.value = 0;
            preferredQtyInput.disabled = true;
        }

        if (costInput) {
            costInput.value = 0;
        }

        if (markupInput) {
            markupInput.value = 0;
        }

        if (lowStockWarning) {
            lowStockWarning.checked = false;
            lowStockWarning.disabled = true;
        }

        if (inputLowStockWarning) {
            inputLowStockWarning.value = '';
            inputLowStockWarning.disabled = true;
        }

    } else {
        if (preferredQtyInput) {
            preferredQtyInput.disabled = false;
        }
    }
}

function toggleRequired(input, required) {
    if (!input) return;

    input.required = required;

    if (!required) {
        input.removeAttribute('required');
    } else {
        input.setAttribute('required', 'required');
    }
}

// =========================
// LOW STOCK TOGGLE
// =========================

const lowStockCheckbox =
    document.getElementById('lowStockWarning');

const lowStockThreshold =
    document.getElementById('lowStockThreshold');

if (lowStockCheckbox && lowStockThreshold) {
    lowStockCheckbox.addEventListener('change', () => {
        lowStockThreshold.disabled = !lowStockCheckbox.checked;

        if (!lowStockCheckbox.checked) {
            lowStockThreshold.value = '';
        }
    });
}

// =========================
// TAX TOGGLE
// =========================

const taxCheckbox =
    document.getElementById('enableInputTax');

const taxInput =
    document.getElementById('tax');

if (taxCheckbox && taxInput) {
    taxCheckbox.addEventListener('change', () => {
        taxInput.disabled = !taxCheckbox.checked;

        if (!taxCheckbox.checked) {
            taxInput.value = '';
        }
    });
}

// =========================
// FORM SUBMIT
// =========================

formCreate.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(formCreate);

    // Set nilai boolean sesuai dengan model
    formData.set('requireQtyInput', formData.get('requireQtyInput') === 'on');
    formData.set('priceChangeAllowed', formData.get('priceChangeAllowed') === 'on');
    formData.set('enableAltDesc', formData.get('enableAltDesc') === 'on');
    formData.set('enableInputTax', formData.get('enableInputTax') === 'on');
    formData.set('lowStockWarning', formData.get('lowStockWarning') === 'on');
    
    // Jika tax tidak aktif, kosongkan tax
    if (formData.get('enableInputTax') !== 'true') {
        formData.set('tax', '');
    }

    // Jika low stock warning tidak aktif, kosongkan threshold
    if (formData.get('lowStockWarning') !== 'true') {
        formData.set('lowStockThreshold', '');
    }

    // Type produk
    const productType = formData.get('type');
    if (productType === 'ppob') {
        formData.set('priceChangeAllowed', 'true');
        formData.set('stock', 0);
    }

    if (productType === 'ppob' || productType === 'service') {
        formData.set('stock', 0);
        formData.set('reorderPoint', 0);
        formData.set('preferredQty', 0);
    }

    try {
        const res = await fetch('/products', {
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken
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
                    requireQtyInput: false,
                    priceChangeAllowed: false,
                    enableAltDesc: false
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
            requireQtyInput: false,
            priceChangeAllowed: false,
            enableAltDesc: false
        }
    });
    resetInputErrors(formCreate);

    // Reset image preview
    if (createPreviewEl) {
        createPreviewEl.src = '';
        createPreviewEl.style.display = 'none';
    }
    if (createFileInput) createFileInput.value = '';

    // Reset Product Type ke default (fisik)
    const typeSelect = document.getElementById('productType');
    if (typeSelect) {
        typeSelect.value = 'fisik';
        handleProductTypeChange(typeSelect, 'create');
    }

    // Reset Low Stock Warning
    const lowStockCheckbox = document.getElementById('lowStockWarning');
    const lowStockInput = document.querySelector('input[name="lowStockThreshold"]');
    if (lowStockCheckbox && lowStockInput) {
        lowStockCheckbox.checked = false;
        lowStockCheckbox.disabled = false;
        lowStockInput.value = '';
        lowStockInput.disabled = true;
    }

    // Reset Tax Input
    const taxCheckbox = document.getElementById('enableInputTax');
    const taxInput = document.getElementById('tax');
    if (taxCheckbox && taxInput) {
        taxCheckbox.checked = false;
        taxCheckbox.disabled = false;
        taxInput.value = '';
        taxInput.disabled = true;
    }

    // Reset priceChangeAllowed
    const priceChangeAllowed = document.getElementById('priceChangeAllowed');
    if (priceChangeAllowed) {
        priceChangeAllowed.checked = false;
        priceChangeAllowed.disabled = false;
    }

    // Reset requireQtyInput
    const requireQtyInput = document.getElementById('requireQtyInput');
    if (requireQtyInput) {
        requireQtyInput.checked = false;
        requireQtyInput.disabled = false;
    }
});

// Saat klik Edit
tbody.addEventListener('click', async (e) => {
    if (!e.target.closest('.btn-edit')) return;

    const row = e.target.closest('tr');
    const productId = row.dataset.id;

    if (!productId) return;

    try {
        const res = await fetch(`/products/json/${productId}`);

        if (!res.ok) {
            throw new Error('Failed to fetch product data');
        }

        const result = await res.json();

        if (!result.success) {
            throw new Error(result.message || 'Gagal mengambil data produk');
        }

        const product = result.product;

        // Set action
        formEdit.action = `/products/${productId}`;

        // Reset form
        formEdit.reset();

        // Basic fields
        document.getElementById('editInputName').value = product.name ?? '';
        document.getElementById('editCategorySelect').value = product.categoryId ?? '';
        document.getElementById('editProductCode').value = product.code ?? '';
        document.getElementById('editInputBarcode').value = product.barcode ?? '';
        document.getElementById('editUnit').value = product.unit ?? '';
        document.getElementById('editSupplierSelect').value = product.supplierId ?? '';

        // Checkbox
        document.getElementById('editRequireQtyInput').checked = !!product.requireQtyInput;
        document.getElementById('editPriceChangeAllowed').checked = !!product.priceChangeAllowed;
        document.getElementById('editEnableLowStockWarning').checked = !!product.lowStockWarning;
        document.getElementById('editEnableInputTax').checked = !!product.enableInputTax;
        document.getElementById('editEnableAltDesc').checked = !!product.enableAltDesc;

        // Type
        const editType = document.getElementById('editProductType');
        editType.value = product.type ?? 'fisik';
        editType.disabled = true;

        // Numeric fields
        document.getElementById('editInputCost').value = product.cost ?? '';
        document.getElementById('editInputMarkup').value = product.markup ?? '';
        document.getElementById('editInputSalePrice').value = product.salePrice ?? '';
        document.getElementById('editReorderPoint').value = product.reorderPoint ?? '';
        document.getElementById('editPreferredQty').value = product.preferredQty ?? '';
        document.getElementById('editLowStockThreshold').value = product.lowStockThreshold ?? '';
        document.getElementById('editTax').value = product.tax ?? '';

        // Enable/disable field
        document.getElementById('editLowStockThreshold').disabled = !product.lowStockWarning;
        document.getElementById('editTax').disabled = !product.enableInputTax;

        // Jalankan UI type handler
        handleProductTypeChange(editType, 'edit');

        // Preview image
        const previewEl = document.getElementById('editProductPreview');

        if (product.image) {
            previewEl.src = product.image;
            previewEl.style.display = 'block';
        } else {
            previewEl.src = '';
            previewEl.style.display = 'none';
        }

        // Preview gambar baru
        const fileInput = document.getElementById('editProductImage');

        fileInput.onchange = function () {
            if (this.files && this.files[0]) {
                previewEl.src = URL.createObjectURL(this.files[0]);
                previewEl.style.display = 'block';
            } else {
                previewEl.src = product.image || '';
                previewEl.style.display = product.image ? 'block' : 'none';
            }
        };

        setupEditMarkupSalePriceHandlers();

        bootstrap.Modal.getOrCreateInstance(modalEdit).show();

    } catch (err) {
        console.error(err);

        showToast({
            type: 'danger',
            title: 'Error',
            message: err.message || 'Gagal mengambil data produk'
        });
    }
});

function setupEditMarkupSalePriceHandlers() {
    const editInputCost = document.getElementById('editInputCost');
    const editInputMarkup = document.getElementById('editInputMarkup');
    const editInputSalePrice = document.getElementById('editInputSalePrice');
    const editProductType = document.getElementById('editProductType');

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

    // Remove old listeners first to avoid duplicates
    const newCost = editInputCost.cloneNode(true);
    const newMarkup = editInputMarkup.cloneNode(true);
    const newSalePrice = editInputSalePrice.cloneNode(true);
    
    editInputCost.parentNode.replaceChild(newCost, editInputCost);
    editInputMarkup.parentNode.replaceChild(newMarkup, editInputMarkup);
    editInputSalePrice.parentNode.replaceChild(newSalePrice, editInputSalePrice);
    
    // Re-assign variables
    const finalEditInputCost = document.getElementById('editInputCost');
    const finalEditInputMarkup = document.getElementById('editInputMarkup');
    const finalEditInputSalePrice = document.getElementById('editInputSalePrice');

    finalEditInputCost?.addEventListener('input', () => {
        editLastChanged = null;
        editUpdateSalePrice();
    });
    
    finalEditInputMarkup?.addEventListener('input', () => {
        editLastChanged = null;
        editUpdateSalePrice();
    });
    
    finalEditInputSalePrice?.addEventListener('input', () => {
        editLastChanged = null;
        editUpdateMarkup();
    });

    editProductType?.addEventListener('change', () => {
        const type = editProductType.value;
        handleProductTypeChange(editProductType, 'edit');

        if (type === 'service') {
            if (!finalEditInputCost.value) {
                finalEditInputCost.value = '0';
            }
        }

        if (type === 'ppob') {
            finalEditInputCost.value = 0;
            finalEditInputMarkup.value = 0;
            // Jangan reset salePrice, biarkan dari database
        }
    });
}

// submit edit
formEdit.addEventListener('submit', async (e) => {
    e.preventDefault();

    resetInputErrors(formEdit);

    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

    const formData = new FormData(formEdit);

    // Karena disabled tidak ikut terkirim
    const editType = document.getElementById('editProductType').value;

    formData.set('type', editType);

    // Boolean normalization
    formData.set('requireQtyInput', formData.get('requireQtyInput') === 'on');
    formData.set('priceChangeAllowed', formData.get('priceChangeAllowed') === 'on');
    formData.set('enableAltDesc', formData.get('enableAltDesc') === 'on');
    formData.set('enableInputTax', formData.get('enableInputTax') === 'on');
    formData.set('lowStockWarning', formData.get('lowStockWarning') === 'on');

    // PPOB backend consistency
    if (editType === 'ppob') {
        formData.set('priceChangeAllowed', true);
    }

    if (editType === 'service') {
        formData.set('cost', 0);
        formData.set('markup', 0);
        formData.set('reorderPoint', 0);
        formData.set('preferredQty', 0);
        formData.set('lowStockWarning', false);
        formData.set('lowStockThreshold', '');
    }

    if (editType === 'ppob') {
        formData.set('reorderPoint', 0);
        formData.set('preferredQty', 0);
        formData.set('lowStockWarning', false);
        formData.set('lowStockThreshold', '');
    }

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
    document.getElementById('editLowStockThreshold').disabled = !e.target.checked;
});

document.getElementById('editEnableInputTax')?.addEventListener('change', e => {
    document.getElementById('editTax').disabled = !e.target.checked;
});

const inputCost = document.getElementById('inputCost');
const inputMarkup = document.getElementById('inputMarkup');
const inputSalePrice = document.getElementById('inputSalePrice');

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

document.getElementById('lowStockWarning').addEventListener('change', function () {
    document.getElementById('lowStockThreshold').disabled = !this.checked;
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

    const typeSelect = document.getElementById('productType');
    if (typeSelect) {
        handleProductTypeChange(typeSelect, 'create');
    }
});

// Filter berdasarkan type produk
document.getElementById('typeFilter')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value) {
        params.set('type', e.target.value);
    } else {
        params.delete('type');
    }
    window.location.search = params.toString();
});

// Filter berdasarkan requireQtyInput
document.getElementById('requireQtyFilter')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value !== '') {
        params.set('requireQty', e.target.value);
    } else {
        params.delete('requireQty');
    }
    window.location.search = params.toString();
});

// Filter berdasarkan priceChangeAllowed
document.getElementById('priceChangeFilter')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value !== '') {
        params.set('priceChange', e.target.value);
    } else {
        params.delete('priceChange');
    }
    window.location.search = params.toString();
});

// Filter berdasarkan enableAltDesc
document.getElementById('altDescFilter')?.addEventListener('change', (e) => {
    const params = new URLSearchParams(window.location.search);
    if (e.target.value !== '') {
        params.set('altDesc', e.target.value);
    } else {
        params.delete('altDesc');
    }
    window.location.search = params.toString();
});

// ========================================
// SORTING
// ========================================

function sortTableBy(column, ascending = true) {
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const aCell = a.querySelector(`td[data-column="${column}"]`);
        const bCell = b.querySelector(`td[data-column="${column}"]`);

        let aVal = aCell?.dataset.value || aCell?.textContent?.trim() || '';
        let bVal = bCell?.dataset.value || bCell?.textContent?.trim() || '';

        // Hapus "Rp " dan titik untuk sorting harga
        if (column === 'cost' || column === 'salePrice') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
            return ascending ? aVal - bVal : bVal - aVal;
        }

        // Default string comparison
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
syncFiltersFromURL();