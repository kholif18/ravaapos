// /public/assets/js/product/productFormState.js

export class ProductFormState {
    constructor(context = 'create') {
        this.context = context;
        this.cache = new Map();
    }

    getElement(id) {
        const cacheKey = `${this.context}_${id}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let elementId = id;
        if (this.context === 'edit') {
            elementId = `edit${id.charAt(0).toUpperCase()}${id.slice(1)}`;
        }

        const element = document.getElementById(elementId);
        this.cache.set(cacheKey, element);
        return element;
    }

    setValue(id, value) {
        const el = this.getElement(id);
        if (el) el.value = value;
    }

    getValue(id) {
        const el = this.getElement(id);
        return el ? el.value : null;
    }

    setChecked(id, checked) {
        const el = this.getElement(id);
        if (el) el.checked = checked;
    }

    getChecked(id) {
        const el = this.getElement(id);
        return el ? el.checked : false;
    }

    setDisabled(id, disabled) {
        const el = this.getElement(id);
        if (el) el.disabled = disabled;
    }

    setRequired(id, required) {
        const el = this.getElement(id);
        if (el) {
            el.required = required;
            if (!required) el.removeAttribute('required');
        }
    }

    setVisibility(id, visible) {
        const el = this.getElement(id);
        if (el && el.closest('.col-md-4')) {
            el.closest('.col-md-4').style.display = visible ? '' : 'none';
        }
    }
}