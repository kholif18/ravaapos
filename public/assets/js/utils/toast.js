// public/assets/js/utils/toast.js
export function showToast({
    title,
    message = '',
    type = 'info',
    delay = 3000
}) {
    const container = document.getElementById('toastContainer');
    const template = document.getElementById('baseToastTemplate');

    if (!container || !template) return;

    const validTypes = ['success', 'danger', 'warning', 'info'];
    const toastType = validTypes.includes(type) ? type : 'info';

    const iconMap = {
        success: 'bx-check-circle',
        danger: 'bx-x-circle',
        warning: 'bx-error-alt',
        info: 'bx-info-circle'
    };

    const colorMap = {
        success: ['bg-success', 'text-white'],
        danger: ['bg-danger', 'text-white'],
        warning: ['bg-warning', 'text-dark'],
        info: ['bg-info', 'text-dark']
    };

    const clone = template.firstElementChild.cloneNode(true);
    clone.classList.remove('d-none');
    clone.classList.add('shadow', 'rounded');

    const icon = iconMap[toastType];
    const colorClass = colorMap[toastType];

    const header = clone.querySelector('.toast-header');
    const body = clone.querySelector('.toast-body');

    clone.querySelector('.toast-icon').classList.add('bx', icon);
    clone.querySelector('.toast-title').textContent = title || toastType.charAt(0).toUpperCase() + toastType.slice(1);
    clone.querySelector('.toast-time').textContent = 'Baru saja';
    body.textContent = message;

    header.classList.add('rounded-top', ...colorClass);
    body.classList.add(...colorClass, 'rounded-bottom');

    container.appendChild(clone);

    const bsToast = new bootstrap.Toast(clone, {
        delay
    });
    bsToast.show();

    clone.addEventListener('hidden.bs.toast', () => {
        clone.remove();
    });
}
