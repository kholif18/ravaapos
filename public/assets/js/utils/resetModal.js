// public/assets/js/utils/resetModal.js
export function resetModalForm(modalEl, options = {}) {
    if (!modalEl) return;

    const form = modalEl.querySelector('form');
    if (form) {
        // Reset semua field value secara manual
        form.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });

        form.removeAttribute('data-id');

        if (options.defaultAction) {
            form.action = options.defaultAction;
        }
    }

    // Bersihkan invalid/error class
    modalEl.querySelectorAll('input, textarea, select').forEach(input => {
        input.classList.remove('is-invalid');
    });

    // Sembunyikan field opsional
    if (Array.isArray(options.hideFields)) {
        options.hideFields.forEach(selector => {
            const el = modalEl.querySelector(selector);
            if (el) el.classList.add('d-none');
        });
    }

    // Reset title modal jika disediakan
    if (options.title) {
        const titleEl = modalEl.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = options.title;
    }
}
