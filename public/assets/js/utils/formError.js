export function showInputErrors(errors, formElement) {
    // Bersihkan error sebelumnya
    formElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    formElement.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

    for (const [field, message] of Object.entries(errors)) {
        const input = formElement.querySelector(`[name="${field}"]`);
        if (!input) continue;

        input.classList.add('is-invalid');

        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;

        // Letakkan feedback setelah input
        input.parentNode.appendChild(feedback);
    }
}

export function resetInputErrors(formElement) {
    formElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    formElement.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
}