// public/assets/js/pages/promo.js
import { showToast } from '/assets/js/utils/toast.js';
import { confirmDelete } from '/assets/js/utils/confirm.js';

document.addEventListener('DOMContentLoaded', function() {
    const promoModal = document.getElementById('promoModal');
    const promoForm = document.getElementById('promoForm');
    
    // ==================== DOM ELEMENT REFERENCES ====================
    const promoType = document.getElementById('promoType');
    const maxDiscountGroup = document.getElementById('maxDiscountGroup');
    const valuePrefix = document.getElementById('valuePrefix');
    const applyType = document.getElementById('applyType');
    const categoryWrapper = document.getElementById('categorySelectWrapper');
    const productWrapper = document.getElementById('productSelectWrapper');
    const promoCode = document.getElementById('promoCode');
    
    // ==================== INISIALISASI SEARCH UNTUK KATEGORI & PRODUK ===================
    
    let categorySearchDropdown = null;
    let productSearchDropdown = null;

    // Inisialisasi search untuk kategori
    function initCategorySearch() {
        const categoryInput = document.getElementById('categorySearchInput');
        const categoryDropdown = document.getElementById('categoryDropdown');
        const categoryResultsList = document.getElementById('categoryResultsList');
        const categoryIdField = document.getElementById('categoryId');

        let selectedIndex = -1;

        if (!categoryInput) return;

        function updateSelected(items) {
            items.forEach((item, idx) => {
                if (idx === selectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({
                        block: 'nearest'
                    });
                } else {
                    item.classList.remove('selected');
                }
            });
        }

        // Tutup dropdown saat klik di luar
        document.addEventListener('click', function (e) {
            if (!categoryInput.contains(e.target) && categoryDropdown) {
                categoryDropdown.style.display = 'none';
                selectedIndex = -1;
            }
        });

        // Event input untuk mencari kategori
        categoryInput.addEventListener('input', debounce(async function () {
            const query = this.value.trim();

            if (query.length < 2) {
                categoryDropdown.style.display = 'none';
                return;
            }

            try {
                const response = await fetch(`/api/categories/search?q=${encodeURIComponent(query)}`);
                const categories = await response.json();

                if (categories.length === 0) {
                    categoryResultsList.innerHTML = '<div class="search-dropdown-empty">Kategori tidak ditemukan</div>';
                } else {
                    categoryResultsList.innerHTML = categories.map((cat, idx) => `
                        <div class="search-dropdown-item" data-index="${idx}" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}">
                            <div class="search-dropdown-info">
                                <div class="search-dropdown-name">
                                    <span class="item-name">${escapeHtml(cat.name)}</span>
                                </div>
                                <div class="search-dropdown-meta">
                                    <span class="item-stock">
                                        <i class="bx bx-category"></i>
                                        Kategori
                                    </span>
                                </div>
                            </div>
                        </div>
                    `).join('');

                    // Tambahkan event click pada hasil
                    categoryResultsList.querySelectorAll('.search-dropdown-item').forEach(item => {
                        item.addEventListener('click', function () {
                            const id = this.dataset.id;
                            const name = this.dataset.name;
                            categoryInput.value = name;
                            categoryIdField.value = id;
                            categoryDropdown.style.display = 'none';
                        });
                    });
                }

                categoryDropdown.style.display = 'block';
            } catch (error) {
                console.error('Search category error:', error);
            }
        }, 300));

        // Navigasi keyboard
        categoryInput.addEventListener('keydown', function (e) {
            const items = categoryResultsList.querySelectorAll('.search-dropdown-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (selectedIndex < items.length - 1) {
                    selectedIndex++;
                    updateSelected(items);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selectedIndex > 0) {
                    selectedIndex--;
                    updateSelected(items);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    items[selectedIndex].click();
                }
            } else if (e.key === 'Escape') {
                categoryDropdown.style.display = 'none';
                selectedIndex = -1;
            }
        });
    }

    // Inisialisasi search untuk produk
    function initProductSearch() {
        const productInput = document.getElementById('productSearchInput');
        const productDropdown = document.getElementById('productDropdown');
        const productResultsList = document.getElementById('productResultsList');
        const productIdField = document.getElementById('productId');

        if (!productInput) return;

        let selectedIndex = -1;

        function updateSelected(items) {
            items.forEach((item, idx) => {
                if (idx === selectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('selected');
                }
            });
        }

        // Tutup dropdown saat klik di luar
        document.addEventListener('click', function (e) {
            if (productInput && !productInput.contains(e.target) && productDropdown) {
                productDropdown.style.display = 'none';
                selectedIndex = -1;
            }
        });

        // Event input untuk mencari produk
        productInput.addEventListener('input', debounce(async function () {
            const query = this.value.trim();

            if (query.length < 2) {
                productDropdown.style.display = 'none';
                return;
            }

            try {
                const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=20`);
                const products = await response.json();

                if (products.length === 0) {
                    productResultsList.innerHTML = '<div class="search-dropdown-empty">Produk tidak ditemukan</div>';
                } else {
                    // Perbaiki: tambahkan parameter idx di map
                    productResultsList.innerHTML = products.map((prod, idx) => {
                        const isService = prod.type === 'service';
                        const isPPOB = prod.type === 'ppob';
                        const isPhysical = prod.type === 'fisik' || !prod.type;
                        const stock = isPhysical ? (prod.stock ?? 0) : '∞';
                        const stockClass = !isPhysical
                            ? 'high-stock'
                            : ((prod.stock ?? 0) <= 0 ? 'low-stock' : ((prod.stock ?? 0) < 10 ? 'medium-stock' : 'high-stock'));

                        return `
                            <div class="search-dropdown-item" data-index="${idx}" data-id="${prod.id}" data-name="${escapeHtml(prod.name)}">
                                <div class="search-dropdown-info">
                                    <div class="search-dropdown-name">
                                        <span class="item-name">${escapeHtml(prod.name)}</span>
                                        ${prod.code ? `<span class="item-code">${escapeHtml(prod.code)}</span>` : ''}
                                        ${isPPOB ? '<span class="badge bg-info ms-1">PPOB</span>' : ''}
                                        ${isService ? '<span class="badge bg-warning ms-1">SVC</span>' : ''}
                                    </div>
                                    <div class="search-dropdown-meta">
                                        <span class="item-price">${formatRupiah(prod.salePrice || 0)}</span>
                                        <span class="item-stock">
                                            <i class="bx bx-package"></i>
                                            Stok: <span class="stock-value ${stockClass}">${stock}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');

                    productResultsList.querySelectorAll('.search-dropdown-item').forEach(item => {
                        item.addEventListener('click', function () {
                            const id = this.dataset.id;
                            const name = this.dataset.name;
                            productInput.value = name;
                            productIdField.value = id;
                            productDropdown.style.display = 'none';
                            selectedIndex = -1;
                        });
                    });
                }

                productDropdown.style.display = 'block';
                selectedIndex = -1;
            } catch (error) {
                console.error('Search product error:', error);
            }
        }, 300));

        // Navigasi keyboard

        function updateSelected(items) {
            items.forEach((item, idx) => {
                if (idx === selectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({
                        block: 'nearest'
                    });
                } else {
                    item.classList.remove('selected');
                }
            });
        }

        productInput.addEventListener('keydown', function (e) {
            const items = productResultsList.querySelectorAll('.search-dropdown-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (selectedIndex < items.length - 1) {
                    selectedIndex++;
                    updateSelected(items);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selectedIndex > 0) {
                    selectedIndex--;
                    updateSelected(items);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && items[selectedIndex]) {
                    items[selectedIndex].click();
                }
            } else if (e.key === 'Escape') {
                productDropdown.style.display = 'none';
                selectedIndex = -1;
            }
        });
    }

    // Helper function debounce
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Helper function escapeHtml
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Panggil inisialisasi search
    initCategorySearch();
    initProductSearch();

    // ==================== TOGGLE MAX DISCOUNT FIELD ====================
    if (promoType) {
        promoType.addEventListener('change', function() {
            if (this.value === 'percent') {
                valuePrefix.textContent = '%';
                maxDiscountGroup.style.display = '';
            } else {
                valuePrefix.textContent = 'Rp';
                maxDiscountGroup.style.display = 'none';
            }
        });
    }
    
    // ==================== TOGGLE CATEGORY/PRODUCT WRAPPER ====================
    if (applyType) {
        applyType.addEventListener('change', function () {
            if (this.value === 'category') {
                categoryWrapper.style.display = '';
                productWrapper.style.display = 'none';
                document.getElementById('categoryId').required = true;
                document.getElementById('productId').required = false;

                // AUTOFOKUS ke input pencarian kategori
                setTimeout(() => {
                    const categorySearchInput = document.getElementById('categorySearchInput');
                    if (categorySearchInput) {
                        categorySearchInput.focus();
                        categorySearchInput.select();
                    }
                }, 150);

            } else if (this.value === 'product') {
                categoryWrapper.style.display = 'none';
                productWrapper.style.display = '';
                document.getElementById('categoryId').required = false;
                document.getElementById('productId').required = true;

                // AUTOFOKUS ke input pencarian produk
                setTimeout(() => {
                    const productSearchInput = document.getElementById('productSearchInput');
                    if (productSearchInput) {
                        productSearchInput.focus();
                        productSearchInput.select();
                    }
                }, 150);

            } else {
                categoryWrapper.style.display = 'none';
                productWrapper.style.display = 'none';
                document.getElementById('categoryId').required = false;
                document.getElementById('productId').required = false;
            }
        });
    }
    
    // ==================== AUTO UPPERCASE PROMO CODE ====================
    if (promoCode) {
        promoCode.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }
    
    // ==================== TOGGLE STATUS PROMO ====================
    document.querySelectorAll('.toggle-status').forEach(checkbox => {
        checkbox.addEventListener('change', async function() {
            const id = this.dataset.id;
            const isActive = this.checked;
            
            try {
                const response = await fetch(`/promo/${id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('input[name="_csrf"]')?.value
                    },
                    body: JSON.stringify({ isActive })
                });
                
                const result = await response.json();
                if (result.success) {
                    showToast({
                        title: 'Sukses',
                        message: `Promo ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
                        type: 'success'
                    });
                } else {
                    this.checked = !isActive;
                    showToast({
                        title: 'Gagal',
                        message: 'Gagal mengubah status',
                        type: 'danger'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                this.checked = !isActive;
                showToast({
                    title: 'Error',
                    message: 'Terjadi kesalahan',
                    type: 'danger'
                });
            }
        });
    });
    
    // ==================== DETAIL PROMO ====================
    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.dataset.name;
            const code = this.dataset.code;
            const type = this.dataset.type === 'percent' ? 'Persen (%)' : 'Nominal (Rp)';
            let value = this.dataset.type === 'percent' ? `${this.dataset.value}%` : `Rp ${new Intl.NumberFormat('id-ID').format(this.dataset.value)}`;
            const maxDiscount = this.dataset.maxDiscount ? `Rp ${new Intl.NumberFormat('id-ID').format(this.dataset.maxDiscount)}` : '-';
            const minTransaction = this.dataset.minTransaction > 0 ? `Rp ${new Intl.NumberFormat('id-ID').format(this.dataset.minTransaction)}` : '-';
            const usage = this.dataset.usageLimit ? `${this.dataset.usedCount || 0} / ${this.dataset.usageLimit}` : 'Tak terbatas';
            
            let period = '-';
            if (this.dataset.startDate || this.dataset.expiredAt) {
                const start = this.dataset.startDate ? new Date(this.dataset.startDate).toLocaleDateString('id-ID') : '-';
                const end = this.dataset.expiredAt ? new Date(this.dataset.expiredAt).toLocaleDateString('id-ID') : '-';
                period = `${start} → ${end}`;
            }
            
            const description = this.dataset.description || '-';
            const isActive = this.dataset.isActive === 'true';
            const statusBadge = isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>';
            
            document.getElementById('detailCode').textContent = code;
            document.getElementById('detailName').textContent = name;
            document.getElementById('detailType').textContent = type;
            document.getElementById('detailValue').textContent = value;
            document.getElementById('detailMaxDiscount').textContent = maxDiscount;
            document.getElementById('detailMinTransaction').textContent = minTransaction;
            document.getElementById('detailUsage').textContent = usage;
            document.getElementById('detailPeriod').textContent = period;
            document.getElementById('detailDescription').textContent = description;
            document.getElementById('detailStatus').innerHTML = statusBadge;
            
            const modal = new bootstrap.Modal(document.getElementById('modalDetail'));
            modal.show();
        });
    });
    
    // ==================== EDIT PROMO ====================
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const data = {
                id: this.dataset.id,
                name: this.dataset.name,
                code: this.dataset.code,
                type: this.dataset.type,
                applyType: this.dataset.applyType,
                categoryId: this.dataset.categoryId,
                productId: this.dataset.productId,
                value: this.dataset.value,
                maxDiscount: this.dataset.maxDiscount,
                minTransaction: this.dataset.minTransaction,
                usageLimit: this.dataset.usageLimit,
                startDate: this.dataset.startDate,
                expiredAt: this.dataset.expiredAt,
                description: this.dataset.description
            };
            
            editPromo(data);
        });
    });
    
    // ==================== DELETE PROMO ====================
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            const name = this.dataset.name;
            
            const confirmed = await confirmDelete(`Promo "${name}" akan dihapus. Lanjutkan?`);
            if (confirmed) {
                try {
                    const response = await fetch(`/promo/delete/${id}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('input[name="_csrf"]')?.value
                        },
                        body: JSON.stringify({})
                    });
                    
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const result = await response.json();
                        if (result.success) {
                            showToast({
                                title: 'Sukses',
                                message: `Promo "${name}" dihapus`,
                                type: 'success'
                            });
                            document.getElementById(`promo-row-${id}`)?.remove();
                        } else {
                            showToast({
                                title: 'Gagal',
                                message: result.message || 'Gagal menghapus promo',
                                type: 'danger'
                            });
                        }
                    } else {
                        const text = await response.text();
                        console.error('Non-JSON response:', text.substring(0, 200));
                        showToast({
                            title: 'Error',
                            message: 'Server mengembalikan response tidak valid',
                            type: 'danger'
                        });
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showToast({
                        title: 'Error',
                        message: 'Terjadi kesalahan',
                        type: 'danger'
                    });
                }
            }
        });
    });
    
    // ==================== SUBMIT FORM CREATE/UPDATE ====================
    if (promoForm) {
        promoForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const method = document.getElementById('formMethod').value;
            const promoId = document.getElementById('promoId').value;
            
            // Kumpulkan data sebagai object
            const formData = {
                name: document.getElementById('promoName').value,
                code: document.getElementById('promoCode').value,
                type: document.getElementById('promoType').value,
                value: document.getElementById('promoValue').value,
                minTransaction: document.getElementById('promoMinTransaction').value || 0,
                maxDiscount: document.getElementById('promoMaxDiscount').value || null,
                usageLimit: document.getElementById('promoUsageLimit').value || null,
                startDate: document.getElementById('promoStartDate').value || null,
                expiredAt: document.getElementById('promoExpiredAt').value || null,
                description: document.getElementById('promoDescription').value || null,
                applyType: document.getElementById('applyType').value,
                categoryId: document.getElementById('categoryId').value || null,
                productId: document.getElementById('productId').value || null,
                _method: method,
                id: promoId
            };
            
            let url = '/promo/create';
            if (method === 'PUT' && promoId) {
                url = `/promo/update/${promoId}`;
            }
            
            // Validasi
            if (!formData.name || !formData.code || !formData.value) {
                showToast({
                    title: 'Validasi Gagal',
                    message: 'Nama, kode, dan nilai diskon wajib diisi',
                    type: 'danger'
                });
                return;
            }
            
            // Validasi untuk category/product
            if (formData.applyType === 'category' && !formData.categoryId) {
                showToast({
                    title: 'Validasi Gagal',
                    message: 'Silakan pilih kategori untuk promo ini',
                    type: 'danger'
                });
                return;
            }
            
            if (formData.applyType === 'product' && !formData.productId) {
                showToast({
                    title: 'Validasi Gagal',
                    message: 'Silakan pilih produk untuk promo ini',
                    type: 'danger'
                });
                return;
            }
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('input[name="_csrf"]')?.value,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showToast({
                        title: 'Sukses',
                        message: result.message,
                        type: 'success'
                    });
                    const modal = bootstrap.Modal.getInstance(promoModal);
                    modal.hide();
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    if (result.codeError) {
                        const codeError = document.getElementById('codeError');
                        if (codeError) codeError.style.display = 'block';
                    } else {
                        showToast({
                            title: 'Gagal',
                            message: result.message || 'Gagal menyimpan promo',
                            type: 'danger'
                        });
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                showToast({
                    title: 'Error',
                    message: 'Terjadi kesalahan',
                    type: 'danger'
                });
            }
        });
    }
    
    // ==================== RESET MODAL WHEN CLOSED ====================
    if (promoModal) {
        promoModal.addEventListener('hidden.bs.modal', function() {
            if (promoForm) {
                promoForm.reset();
            }
            
            // Reset hidden fields
            const formMethod = document.getElementById('formMethod');
            if (formMethod) formMethod.value = 'POST';
            
            const promoId = document.getElementById('promoId');
            if (promoId) promoId.value = '';
            
            // Reset code input
            const codeInput = document.getElementById('promoCode');
            if (codeInput) {
                codeInput.readOnly = false;
                codeInput.classList.remove('bg-light');
                codeInput.value = '';
            }
            
            const codeReadonlyHint = document.getElementById('codeReadonlyHint');
            if (codeReadonlyHint) codeReadonlyHint.style.display = 'none';
            
            const codeError = document.getElementById('codeError');
            if (codeError) codeError.style.display = 'none';
            
            // Reset applyType ke default
            const applyTypeSelect = document.getElementById('applyType');
            if (applyTypeSelect) applyTypeSelect.value = 'all';
            
            // Reset categoryId dan productId
            const categoryIdSelect = document.getElementById('categoryId');
            if (categoryIdSelect) categoryIdSelect.value = '';
            
            const productIdSelect = document.getElementById('productId');
            if (productIdSelect) productIdSelect.value = '';
            
            // Sembunyikan wrapper
            const categoryWrap = document.getElementById('categorySelectWrapper');
            const productWrap = document.getElementById('productSelectWrapper');
            if (categoryWrap) categoryWrap.style.display = 'none';
            if (productWrap) productWrap.style.display = 'none';
            
            // Reset button
            const submitBtn = document.getElementById('promoSubmitBtn');
            if (submitBtn) {
                submitBtn.textContent = 'Simpan';
                submitBtn.classList.remove('btn-warning');
                submitBtn.classList.add('btn-primary');
            }
            
            // Reset modal title
            const modalTitle = document.getElementById('promoModalTitle');
            if (modalTitle) modalTitle.textContent = 'Tambah Promo';
            
            // Reset max discount visibility
            const promoTypeEl = document.getElementById('promoType');
            const maxDiscountGroupEl = document.getElementById('maxDiscountGroup');
            const valuePrefixEl = document.getElementById('valuePrefix');
            
            if (promoTypeEl && maxDiscountGroupEl && valuePrefixEl) {
                if (promoTypeEl.value === 'fixed') {
                    maxDiscountGroupEl.style.display = 'none';
                    valuePrefixEl.textContent = 'Rp';
                } else {
                    maxDiscountGroupEl.style.display = '';
                    valuePrefixEl.textContent = '%';
                }
            }
            
            // Remove invalid class
            promoForm?.querySelectorAll('.is-invalid').forEach(field => {
                field.classList.remove('is-invalid');
            });
        });
    }
    
    // ==================== EXPORT CSV ====================
    document.getElementById('btnExportCSV')?.addEventListener('click', function() {
        window.location.href = '/promo/export';
    });
    
    // ==================== DOWNLOAD TEMPLATE CSV ====================
    document.getElementById('btnDownloadTemplate')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/promo/template';
    });
    
    // ==================== EDIT PROMO FUNCTION ====================
    function editPromo(data) {
        const modalTitle = document.getElementById('promoModalTitle');
        const formMethod = document.getElementById('formMethod');
        const promoId = document.getElementById('promoId');
        const promoName = document.getElementById('promoName');
        const promoCodeInput = document.getElementById('promoCode');
        const promoTypeSelect = document.getElementById('promoType');
        const promoValueInput = document.getElementById('promoValue');
        const promoMaxDiscountInput = document.getElementById('promoMaxDiscount');
        const promoMinTransactionInput = document.getElementById('promoMinTransaction');
        const promoUsageLimitInput = document.getElementById('promoUsageLimit');
        const promoStartDateInput = document.getElementById('promoStartDate');
        const promoExpiredAtInput = document.getElementById('promoExpiredAt');
        const promoDescriptionInput = document.getElementById('promoDescription');
        const submitBtn = document.getElementById('promoSubmitBtn');
        const codeReadonlyHintEl = document.getElementById('codeReadonlyHint');
        const maxDiscountGroupEl = document.getElementById('maxDiscountGroup');
        const valuePrefixEl = document.getElementById('valuePrefix');
        const applyTypeSelect = document.getElementById('applyType');
        const categoryIdSelect = document.getElementById('categoryId');
        const productIdSelect = document.getElementById('productId');
        const categoryWrap = document.getElementById('categorySelectWrapper');
        const productWrap = document.getElementById('productSelectWrapper');

        modalTitle.textContent = 'Edit Promo';
        formMethod.value = 'PUT';
        promoId.value = data.id;
        promoName.value = data.name;
        promoCodeInput.value = data.code;
        promoTypeSelect.value = data.type;

        // Set applyType
        if (applyTypeSelect) {
            applyTypeSelect.value = data.applyType || 'all';

            // Tampilkan wrapper yang sesuai
            if (data.applyType === 'category') {
                if (categoryWrap) categoryWrap.style.display = '';
                if (productWrap) productWrap.style.display = 'none';
            } else if (data.applyType === 'product') {
                if (categoryWrap) categoryWrap.style.display = 'none';
                if (productWrap) productWrap.style.display = '';
            } else {
                if (categoryWrap) categoryWrap.style.display = 'none';
                if (productWrap) productWrap.style.display = 'none';
            }
        }

        // Set categoryId jika ada
        if (categoryIdSelect && data.categoryId) {
            categoryIdSelect.value = data.categoryId;
        }

        // Set productId jika ada
        if (productIdSelect && data.productId) {
            productIdSelect.value = data.productId;
        }

        promoValueInput.value = data.value;
        promoMaxDiscountInput.value = data.maxDiscount || '';
        promoMinTransactionInput.value = data.minTransaction || 0;
        promoUsageLimitInput.value = data.usageLimit || '';

        // Format tanggal
        if (data.startDate) {
            const date = new Date(data.startDate);
            promoStartDateInput.value = date.toISOString().slice(0, 16);
        } else {
            promoStartDateInput.value = '';
        }

        if (data.expiredAt) {
            const date = new Date(data.expiredAt);
            promoExpiredAtInput.value = date.toISOString().slice(0, 16);
        } else {
            promoExpiredAtInput.value = '';
        }

        promoDescriptionInput.value = data.description || '';

        // Disable code input untuk edit
        promoCodeInput.readOnly = true;
        promoCodeInput.classList.add('bg-light');
        if (codeReadonlyHintEl) codeReadonlyHintEl.style.display = 'block';

        // Update button style
        submitBtn.textContent = 'Update';
        submitBtn.classList.remove('btn-primary');
        submitBtn.classList.add('btn-warning');

        // Toggle max discount field visibility
        if (data.type === 'percent') {
            if (maxDiscountGroupEl) maxDiscountGroupEl.style.display = '';
            if (valuePrefixEl) valuePrefixEl.textContent = '%';
        } else {
            if (maxDiscountGroupEl) maxDiscountGroupEl.style.display = 'none';
            if (valuePrefixEl) valuePrefixEl.textContent = 'Rp';
        }

        // ✅ Hapus event listener lama sebelum menambah yang baru
        promoModal.removeEventListener('shown.bs.modal', focusOnPromoName);
        promoModal.addEventListener('shown.bs.modal', focusOnPromoName);

        // Buka modal
        const modal = new bootstrap.Modal(promoModal);
        modal.show();
    }
    
    // ==================== RESET PROMO FORM FUNCTION ====================
    window.resetPromoForm = function() {
        if (promoForm) {
            promoForm.reset();
        }
        
        // Reset hidden fields
        const formMethod = document.getElementById('formMethod');
        if (formMethod) formMethod.value = 'POST';
        
        const promoId = document.getElementById('promoId');
        if (promoId) promoId.value = '';
        
        // Reset code input
        const codeInput = document.getElementById('promoCode');
        if (codeInput) {
            codeInput.readOnly = false;
            codeInput.classList.remove('bg-light');
            codeInput.value = '';
        }
        
        const codeReadonlyHint = document.getElementById('codeReadonlyHint');
        if (codeReadonlyHint) codeReadonlyHint.style.display = 'none';
        
        const codeError = document.getElementById('codeError');
        if (codeError) codeError.style.display = 'none';
        
        // Reset applyType ke default
        const applyTypeSelect = document.getElementById('applyType');
        if (applyTypeSelect) applyTypeSelect.value = 'all';
        
        // Reset categoryId dan productId
        const categoryIdSelect = document.getElementById('categoryId');
        if (categoryIdSelect) categoryIdSelect.value = '';
        
        const productIdSelect = document.getElementById('productId');
        if (productIdSelect) productIdSelect.value = '';
        
        // Sembunyikan wrapper
        const categoryWrap = document.getElementById('categorySelectWrapper');
        const productWrap = document.getElementById('productSelectWrapper');
        if (categoryWrap) categoryWrap.style.display = 'none';
        if (productWrap) productWrap.style.display = 'none';
        
        // Reset button
        const submitBtn = document.getElementById('promoSubmitBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Simpan';
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-primary');
        }
        
        // Reset title
        const modalTitle = document.getElementById('promoModalTitle');
        if (modalTitle) modalTitle.textContent = 'Tambah Promo';
        
        // Reset max discount visibility
        const promoTypeEl = document.getElementById('promoType');
        const maxDiscountGroupEl = document.getElementById('maxDiscountGroup');
        const valuePrefixEl = document.getElementById('valuePrefix');
        
        if (promoTypeEl && maxDiscountGroupEl && valuePrefixEl) {
            if (promoTypeEl.value === 'fixed') {
                maxDiscountGroupEl.style.display = 'none';
                valuePrefixEl.textContent = 'Rp';
            } else {
                maxDiscountGroupEl.style.display = '';
                valuePrefixEl.textContent = '%';
            }
        }
        
        // Remove invalid class
        promoForm?.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });

        // ✅ Gunakan event 'shown.bs.modal' untuk fokus setelah modal selesai animasi
        if (promoModal) {
            // Hapus event listener lama jika ada
            promoModal.removeEventListener('shown.bs.modal', focusOnPromoName);
            // Tambahkan event listener baru
            promoModal.addEventListener('shown.bs.modal', focusOnPromoName);
        } else {
            // Fallback jika modal tidak ditemukan
            setTimeout(() => {
                const promoNameInput = document.getElementById('promoName');
                if (promoNameInput) {
                    promoNameInput.focus();
                    promoNameInput.select();
                }
            }, 300);
        }
    };

    // ✅ Function terpisah untuk fokus ke promo name
    function focusOnPromoName() {
        setTimeout(() => {
            const promoNameInput = document.getElementById('promoName');
            if (promoNameInput) {
                promoNameInput.focus();
                promoNameInput.select();
            }
        }, 50);
    }
});