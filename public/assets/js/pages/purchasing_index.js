import {
    showToast
} from '/assets/js/utils/toast.js';
import {
    initPagination
} from '../utils/initPagination.js';

document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#purchasingTbody');
    const paginationWrapper = document.querySelector('#purchasingPaginationWrapper');
    const searchInput = document.querySelector('#searchPurchasing');
    const supplierFilter = document.querySelector('#filterSupplier'); // kalau ada filter supplier
    const statusFilter = document.querySelector('#filterStatus'); // kalau ada filter status

    let state = {
        page: parseInt(tbody.dataset.page) || 1,
        limit: parseInt(tbody.dataset.limit) || 10,
        search: '',
        supplier: '',
        status: ''
    };

    function loadPurchasings() {
        const params = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            search: state.search,
            supplier: state.supplier,
            status: state.status
        });

        fetch(`/purchasing/listPartial?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(res => res.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Ambil wrapper lengkap
                const newWrapper = doc.querySelector('#purchasingWrapper');
                if (newWrapper) {
                    const wrapper = document.querySelector('#purchasingWrapper');
                    wrapper.innerHTML = newWrapper.innerHTML;
                }

                // Bind event untuk tombol baru
                bindEvents();
            })
            .catch(err => console.error('Gagal memuat data purchasing:', err));
    }

    function bindEvents() {
        const tbody = document.querySelector('#purchasingTbody');
        const paginationWrapper = document.querySelector('#purchasingPaginationWrapper');

        // Pagination
        initPagination({
            onPageChange: (page) => {
                state.page = page;
                loadPurchasings();
            },
            onLimitChange: (limit) => {
                state.limit = limit;
                state.page = 1;
                loadPurchasings();
            }
        });

        // Tombol aksi (complete, cancel, return, view)
        tbody.querySelectorAll('.btn-complete, .btn-cancel, .btn-return, .btn-view').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;

                if (btn.classList.contains('btn-view')) {
                    // Load modal detail via AJAX
                    fetch(`/purchasing/view/${id}`, {
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        })
                        .then(res => res.text())
                        .then(html => {
                            document.querySelector('#modalViewContent').innerHTML = html;
                            const modal = new bootstrap.Modal(document.querySelector('#modalViewPurchasing'));
                            modal.show();
                        });
                    return;
                }

                const action = btn.classList.contains('btn-complete') ? 'complete' :
                    btn.classList.contains('btn-cancel') ? 'cancel' : 'return';

                fetch(`/purchasing/${id}/${action}`, {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) loadPurchasings();
                        else alert(data.message || 'Aksi gagal');
                    });
            };
        });

        // Tombol delete (jika ada)
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = () => {
                if (!confirm('Yakin ingin menghapus purchasing ini?')) return;
                const id = btn.dataset.id;
                fetch(`/purchasing/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) loadPurchasings();
                        else alert(data.message || 'Gagal menghapus data');
                    });
            };
        });
    }

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            state.search = searchInput.value;
            state.page = 1;
            loadPurchasings();
        });
    }

    // Filter supplier
    if (supplierFilter) {
        supplierFilter.addEventListener('change', () => {
            state.supplier = supplierFilter.value;
            state.page = 1;
            loadPurchasings();
        });
    }

    // Filter status
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            state.status = statusFilter.value;
            state.page = 1;
            loadPurchasings();
        });
    }

    // First bind events (supaya pagination & tombol langsung aktif dari server render)
    bindEvents();
});