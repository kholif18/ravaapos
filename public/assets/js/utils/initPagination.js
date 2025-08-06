// utils/initPagination.js
export function initPagination({
    onPageChange,
    onLimitChange
}) {
    document.querySelectorAll('[data-page]').forEach(btn => {
        btn.onclick = e => {
            e.preventDefault();
            const page = parseInt(btn.dataset.page);
            if (!isNaN(page)) onPageChange(page);
        };
    });

    const limitSelect = document.querySelector('#limitSelect');
    if (limitSelect) {
        limitSelect.onchange = () => {
            const limit = parseInt(limitSelect.value);
            if (!isNaN(limit)) onLimitChange(limit);
        };
    }
}
