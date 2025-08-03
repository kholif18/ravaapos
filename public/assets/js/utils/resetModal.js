export function resetModalForm(modalEl, options = {}) {
    if (!modalEl) return;

    const form = modalEl.querySelector('form');
    if (form) {
        form.querySelectorAll('input, select, textarea').forEach(input => {
            const name = input.name;

            if (input.type === 'checkbox' || input.type === 'radio') {
                // Tetapkan default value dari options.defaults jika tersedia
                if (options.defaults && name in options.defaults) {
                    input.checked = !!options.defaults[name];
                } else {
                    input.checked = false;
                }
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

    // Bersihkan class error
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

    // Ganti judul modal
    if (options.title) {
        const titleEl = modalEl.querySelector('.modal-title');
        if (titleEl) titleEl.textContent = options.title;
    }
}
