// /public/assets/js/product/productFormHandler.js

import { getElement, getFieldId } from './productUIRules.js';
import { applyProductTypeRules, initToggleListeners } from './productTypeUI.js';
import { initPriceSync } from './productPriceSync.js';
import { showToast } from '../utils/toast.js';
import { resetModalForm } from '../utils/resetModal.js';
import { showInputErrors, resetInputErrors } from '../utils/formError.js';

let csrfToken = null;

export function setCsrfToken(token) {
    csrfToken = token;
}

/**
 * Get boolean value from FormData
 */
function getBooleanValue(formData, fieldName) {
    return formData.get(fieldName) === 'on';
}

/**
 * Prepare form data for submission
 * Clean - no business logic here, just data conversion
 */
function prepareFormData(formData) {
    const data = {};
    
    for (const [key, value] of formData.entries()) {
        // Skip _method field
        if (key === '_method') continue;
        
        // Convert boolean fields
        if (['requireQtyInput', 'priceChangeAllowed', 'enableAltDesc', 'enableInputTax', 'lowStockWarning'].includes(key)) {
            data[key] = value === 'on';
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

/**
 * Submit form handler (unified for create & edit)
 */
export async function submitProductForm(form, method = 'POST', url = null) {
    const submitUrl = url || form.action;
    const formData = new FormData(form);

    // Remove _method if exists for PUT
    if (method === 'PUT') {
        formData.delete('_method');
    }
    
    try {
        const response = await fetch(submitUrl, {
            method: method,
            headers: {
                'CSRF-Token': csrfToken
            },
            body: formData
        });

        const result = await response.json();
        if (response.ok && result.success) {
            return { success: true, data: result };
        } else {
            console.error('Validation errors:', result.errors);
            return { success: false, errors: result.errors, message: result.message };
        }
    } catch (error) {
        console.error('Submit error:', error);
        return { success: false, message: 'Gagal menyimpan data' };
    }
}

/**
 * Reset form to default state
 */
export function resetForm(context = 'create', modalElement = null) {
    const form = context === 'create' 
        ? document.getElementById('formCreateProduct')
        : document.getElementById('formEditProduct');
    
    if (form) {
        form.reset();
        resetInputErrors(form);
    }
    
    // Reset type to 'fisik' and apply rules
    const typeSelect = getElement('type', context);
    if (typeSelect) {
        typeSelect.value = 'fisik';
        applyProductTypeRules(context);
    }
    
    // Reset hidden type field untuk edit
    if (context === 'edit') {
        const hiddenTypeInput = document.getElementById('editProductTypeHidden');
        if (hiddenTypeInput) {
            hiddenTypeInput.value = 'fisik';
        }
    }

    // Reset image preview
    const previewEl = context === 'create'
        ? document.getElementById('createProductPreview')
        : document.getElementById('editProductPreview');
    const fileInput = context === 'create'
        ? document.getElementById('productImage')
        : document.getElementById('editProductImage');
    
    if (previewEl) {
        previewEl.src = '';
        previewEl.style.display = 'none';
    }
    if (fileInput) fileInput.value = '';
    
    // Reset modal form if modal element provided
    if (modalElement) {
        resetModalForm(modalElement, {
            defaults: {
                requireQtyInput: false,
                priceChangeAllowed: false,
                enableAltDesc: false,
                lowStockWarning: false,
                enableInputTax: false
            }
        });
    }
}

/**
 * Initialize create form
 */
export function initCreateForm(modalElement, onSuccess) {
    const form = document.getElementById('formCreateProduct');
    if (!form) return;
    
    // Remove existing listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const result = await submitProductForm(newForm, 'POST', '/products');
        
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
            
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: 'Product berhasil ditambahkan'
            });
            
            resetForm('create', modalElement);
            if (onSuccess) onSuccess();
        } else {
            if (result.errors) {
                showInputErrors(result.errors, newForm);
            } else {
                showToast({
                    type: 'danger',
                    title: 'Gagal',
                    message: result.message || 'Gagal menambah produk'
                });
            }
        }
    });
}

/**
 * Load product data into edit form
 */
export async function loadProductToEdit(productId) {
    try {
        const response = await fetch(`/products/json/${productId}`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Gagal mengambil data produk');
        }
        
        const product = result.product;
        
        const cleanType = String(product.type || 'fisik').trim().toLowerCase();
        
        const form = document.getElementById('formEditProduct');
        form.action = `/products/${productId}`;
        
        const hiddenTypeInput = document.getElementById('editProductTypeHidden');

        if (hiddenTypeInput) {
            hiddenTypeInput.value = cleanType;
        }

        const typeSelect = getElement('type', 'edit');
        if (typeSelect) {
            typeSelect.value = cleanType;
            typeSelect.disabled = true;
        }

        // Apply rules dengan preserveValues = true
        applyProductTypeRules('edit', true);

        // Basic fields
        getElement('name', 'edit').value = product.name ?? '';
        getElement('category', 'edit').value = product.categoryId ?? '';
        getElement('code', 'edit').value = product.code ?? '';
        getElement('barcode', 'edit').value = product.barcode ?? '';
        getElement('unit', 'edit').value = product.unit ?? '';
        getElement('supplier', 'edit').value = product.supplierId ?? '';
        
        // Checkboxes
        getElement('requireQty', 'edit').checked = !!product.requireQtyInput;
        getElement('priceChange', 'edit').checked = !!product.priceChangeAllowed;
        getElement('lowStockWarning', 'edit').checked = !!product.lowStockWarning;
        getElement('taxCheckbox', 'edit').checked = !!product.enableInputTax;
        
        // Enable Alt Desc checkbox (if exists)
        const enableAltDesc = document.getElementById('editEnableAltDesc');
        if (enableAltDesc) enableAltDesc.checked = !!product.enableAltDesc;

        // Numeric fields
        getElement('cost', 'edit').value = product.cost ?? '';
        getElement('markup', 'edit').value = product.markup ?? '';
        getElement('salePrice', 'edit').value = product.salePrice ?? '';

        const reorderPointInput = getElement('reorderPoint', 'edit');
        if (reorderPointInput) {
            reorderPointInput.value = product.reorderPoint ?? 0;
        }
        
        const preferredQtyInput = getElement('preferredQty', 'edit');
        if (preferredQtyInput) {
            preferredQtyInput.value = product.preferredQty ?? 0;
        }

        getElement('lowStockThreshold', 'edit').value = product.lowStockThreshold ?? '';
        getElement('taxInput', 'edit').value = product.tax ?? '';
        
        const stockInput = document.getElementById('editStock');
        if (stockInput) {
            stockInput.value = product.stock ?? 0;
        }

        // Apply UI rules
        applyProductTypeRules('edit', true);
        initPriceSync('edit');
        initToggleListeners('edit');
        
        // Set image preview
        const previewEl = document.getElementById('editProductPreview');
        if (product.image) {
            previewEl.src = product.image;
            previewEl.style.display = 'block';
        } else {
            previewEl.src = '';
            previewEl.style.display = 'none';
        }
        
        return product;
    } catch (error) {
        console.error('Load product error:', error);
        showToast({
            type: 'danger',
            title: 'Error',
            message: error.message || 'Gagal mengambil data produk'
        });
        return null;
    }
}

/**
 * Initialize edit form
 */
export function initEditForm(modalElement, onSuccess) {
    const form = document.getElementById('formEditProduct');
    if (!form) return;
    
    // Remove existing listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = newForm.action;
        const result = await submitProductForm(newForm, 'PUT', url);
        
        if (result.success) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
            
            showToast({
                type: 'success',
                title: 'Berhasil',
                message: 'Produk berhasil diupdate'
            });
            
            resetForm('edit', modalElement);
            if (onSuccess) onSuccess();
        } else {
            if (result.errors) {
                showInputErrors(result.errors, newForm);
            } else {
                showToast({
                    type: 'danger',
                    title: 'Gagal',
                    message: result.message || 'Gagal mengupdate produk'
                });
            }
        }
    });
}