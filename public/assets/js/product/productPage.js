// /public/assets/js/product/productPage.js

import { setCsrfToken, initCreateForm, initEditForm, loadProductToEdit, resetForm } from './productFormHandler.js';
import { initProductTypeListener, initToggleListeners } from './productTypeUI.js';
import { initPriceSync } from './productPriceSync.js';
import { 
    loadMoreProducts, 
    initSearch, 
    initInfiniteScroll, 
    initFilters, 
    initSorting, 
    initDelete, 
    initExports,
    syncFiltersFromURL,
    resetTableState
} from './productTableHandler.js';
import { showToast } from '../utils/toast.js';

// DOM Elements
const modalCreate = document.getElementById('modalCreate');
const modalEdit = document.getElementById('modalEdit');
const tbody = document.getElementById('productTableBody');
const scrollContainer = document.getElementById('tableScrollContainer');

// Set CSRF Token
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
setCsrfToken(csrfToken);

// ==================== INITIALIZATION ====================

function initCreateModal() {
    if (!modalCreate) return;
    
    // Initialize form when modal is shown
    modalCreate.addEventListener('shown.bs.modal', () => {
        // Focus on name field
        const nameInput = document.getElementById('inputName');
        if (nameInput) nameInput.focus();
        
        // Auto generate product code
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            categorySelect.dispatchEvent(new Event('change'));
        }
        
        // Initialize UI components
        initProductTypeListener('create');
        initToggleListeners('create');
        initPriceSync('create');
    });
    
    // Reset form when modal is hidden
    modalCreate.addEventListener('hidden.bs.modal', () => {
        resetForm('create', modalCreate);
    });
    
    // Initialize form submission
    initCreateForm(modalCreate, () => {
        // Refresh table after successful submit
        resetTableState();
        tbody.innerHTML = '';
        loadMoreProducts(tbody, scrollContainer);
    });
}

function initEditModal() {
    if (!modalEdit) return;
    
    // Handle edit button clicks (delegation)
    tbody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit');
        if (!editBtn) return;
        
        const row = editBtn.closest('tr');
        const productId = row.dataset.id;
        
        if (productId) {
            await loadProductToEdit(productId);
            
            // Initialize UI components for edit mode
            initProductTypeListener('edit');
            initToggleListeners('edit');
            initPriceSync('edit');
            
            // Show modal
            bootstrap.Modal.getOrCreateInstance(modalEdit).show();
        }
    });
    
    // Reset form when modal is hidden
    modalEdit.addEventListener('hidden.bs.modal', () => {
        resetForm('edit', modalEdit);
    });
    
    // Initialize form submission
    initEditForm(modalEdit, () => {
        // Refresh table after successful submit
        resetTableState();
        tbody.innerHTML = '';
        loadMoreProducts(tbody, scrollContainer);
    });
}

function initGenerateBarcode() {
    function generateBarcode(length = 12) {
        let barcode = '';
        for (let i = 0; i < length; i++) {
            barcode += Math.floor(Math.random() * 10);
        }
        return barcode;
    }
    
    // Create modal
    document.getElementById('btnGenerateBarcode')?.addEventListener('click', () => {
        const barcode = generateBarcode();
        document.getElementById('inputBarcode').value = barcode;
    });
    
    // Edit modal
    document.getElementById('btnGenerateEditBarcode')?.addEventListener('click', () => {
        const barcode = generateBarcode();
        document.getElementById('editInputBarcode').value = barcode;
    });
}

function initCategoryCodeGenerator() {
    const categorySelect = document.getElementById('categorySelect');
    if (!categorySelect) return;
    
    categorySelect.addEventListener('change', async () => {
        const categoryId = categorySelect.value;
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
}

function initImagePreview() {
    // Create modal
    const createFileInput = document.getElementById('productImage');
    const createPreview = document.getElementById('createProductPreview');
    
    if (createFileInput && createPreview) {
        createFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                createPreview.src = URL.createObjectURL(this.files[0]);
                createPreview.style.display = 'block';
            } else {
                createPreview.src = '';
                createPreview.style.display = 'none';
            }
        });
    }
    
    // Edit modal - preview handled in loadProductToEdit
    const editFileInput = document.getElementById('editProductImage');
    const editPreview = document.getElementById('editProductPreview');
    
    if (editFileInput && editPreview) {
        editFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                editPreview.src = URL.createObjectURL(this.files[0]);
                editPreview.style.display = 'block';
            }
        });
    }
}

function initImportCSV() {
    const importForm = document.querySelector('#modalImportCSV form');
    if (!importForm) return;
    
    importForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(importForm);
        const btnSubmit = importForm.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Importing...';
        
        try {
            const res = await fetch(importForm.action, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            const result = await res.json();
            
            if (result.success) {
                alert('Import berhasil!');
                importForm.reset();
                bootstrap.Modal.getInstance(document.getElementById('modalImportCSV')).hide();
                // Refresh table
                tbody.innerHTML = '';
                loadMoreProducts(tbody, scrollContainer);
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
}

// ==================== START APPLICATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Sync filters from URL
    syncFiltersFromURL();
    
    // Initialize table components
    initFilters();
    initSorting(tbody);
    initDelete(tbody);
    initSearch(tbody, scrollContainer);
    initInfiniteScroll(tbody, scrollContainer);
    initExports();
    
    // Initialize modals
    initCreateModal();
    initEditModal();
    
    // Initialize utilities
    initGenerateBarcode();
    initCategoryCodeGenerator();
    initImagePreview();
    initImportCSV();
    
    // Load initial data
    await loadMoreProducts(tbody, scrollContainer);
});