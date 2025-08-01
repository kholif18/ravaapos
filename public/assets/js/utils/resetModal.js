// public/assets/js/utils/resetModal.js
export function resetModalForm(modalEl, options = {}) {
    if (!modalEl) return;

    const form = modalEl.querySelector('form');
    if (form) {
        form.reset();
        form.removeAttribute('data-id');

        if (options.defaultAction) {
            form.action = options.defaultAction;
        }
    }

    const inputs = modalEl.querySelectorAll('input, textarea, select');
    inputs.forEach(input => input.classList.remove('is-invalid'));

    if (Array.isArray(options.hideFields)) {
        options.hideFields.forEach(selector => {
            const el = modalEl.querySelector(selector);
            if (el) el.classList.add('d-none');
        });
    }

    if (options.title) {
        const titleEl = modalEl.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = options.title;
    }
}
