import {
    initPagination
} from '../utils/initPagination.js';
import {
    showToast
} from '../utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const tbody = document.querySelector('#purchasingTbody');
    const searchInput = document.querySelector('#searchPurchasing');

    let state = {
        page: 1,
        limit: 10,
        search: '',
        supplier: '',
        status: ''
    };

    async function loadPurchasings() {
        try {
            const params = new URLSearchParams({
                page: state.page,
                limit: state.limit,
                search: state.search,
                supplier: state.supplier,
                status: state.status
            });

            const res = await fetch(`/purchasing/listJSON?${params.toString()}`);
            const data = await res.json();
            if (!data.success) return;

            tbody.innerHTML = '';

            if (data.purchasings.length === 0) {
                tbody.innerHTML = `<tr>
                    <td colspan="6" class="text-center text-muted py-4">Tidak ada data purchasing ditemukan.</td>
                </tr>`;
                initPaginationUI(data.pagination);
                return;
            }

            const startNumber = (data.pagination.page - 1) * data.pagination.limit + 1;

            data.purchasings.forEach((p, i) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${startNumber + i}</td>
                    <td>${new Date(p.date).toLocaleDateString()}</td>
                    <td>${p.supplier?.name || '-'}</td>
                    <td>${p.total.toLocaleString()}</td>
                    <td>
                        ${p.status === 'completed' ? '<span class="badge bg-success">Completed</span>' :
                        p.status === 'draft' ? '<span class="badge bg-warning">Draft</span>' :
                        '<span class="badge bg-danger">Cancelled</span>'}
                        ${p.returnQty > 0 ? `<span class="badge bg-info ms-1">Returned ${p.returnQty}</span>` : ''
                        }
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info btn-view" data-id="${p.id}"><i class="bx bx-show"></i></button>
                        ${p.status === 'draft' ? `
                            <button class="btn btn-sm btn-success btn-complete" data-id="${p.id}"><i class="bx bx-check"></i> Complete</button>
                            <button class="btn btn-sm btn-danger btn-cancel" data-id="${p.id}"><i class="bx bx-x"></i> Cancel</button>
                        ` : p.status === 'completed' ? `
                            <button class="btn btn-sm btn-warning btn-return" data-id="${p.id}"><i class="bx bx-rotate-left"></i> Return</button>
                        ` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });

            bindEvents();
            initPaginationUI(data.pagination);

        } catch (err) {
            console.error('Gagal load data purchasing:', err);
            showToast({
                title: 'Error',
                message: 'Gagal load data purchasing',
                type: 'danger'
            });
        }
    }

    function bindEvents() {
        initPagination({
            onPageChange: p => {
                state.page = p;
                loadPurchasings();
            },
            onLimitChange: l => {
                state.limit = l;
                state.page = 1;
                loadPurchasings();
            }
        });

        tbody.querySelectorAll('.btn-view, .btn-complete, .btn-cancel, .btn-return').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.id;
                if (!id) return;

                try {
                    // === VIEW DETAIL ===
                    if (btn.classList.contains('btn-view')) {
                        const res = await fetch(`/purchasing/view/${id}`, {
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });
                        const data = await res.json();
                        if (!data.success) return showToast({
                            title: 'Error',
                            message: 'Gagal load detail',
                            type: 'danger'
                        });

                        const d = data.data;
                        const html = `
                        <p><strong>Supplier:</strong> ${d.supplier?.name || '-'}</p>
                        <p><strong>Tanggal:</strong> ${new Date(d.date).toLocaleDateString()}</p>
                        <p><strong>Total:</strong> ${d.total.toLocaleString()}</p>
                        <table class="table table-bordered">
                            <thead>
                                <tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr>
                            </thead>
                            <tbody>
                                ${d.items.map(i => `
                                    <tr>
                                        <td>${i.product?.name || '-'}</td>
                                        <td>${i.qty}</td>
                                        <td>${i.price.toLocaleString()}</td>
                                        <td>${(i.qty * i.price).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                        document.getElementById('modalViewContent').innerHTML = html;
                        new bootstrap.Modal(document.getElementById('modalViewPurchasing')).show();
                        return;
                    }

                    // === COMPLETE ===
                    if (btn.classList.contains('btn-complete')) {
                        const res = await fetch(`/purchasing/complete/${id}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken
                            }
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast({
                                type: 'success',
                                title: 'Berhasil',
                                message: data.message || 'Purchasing selesai'
                            });
                            loadPurchasings();
                        } else {
                            showToast({
                                type: 'danger',
                                title: 'Gagal',
                                message: data.message || 'Gagal menyelesaikan purchasing'
                            });
                        }
                        return;
                    }

                    // === CANCEL ===
                    if (btn.classList.contains('btn-cancel')) {
                        const res = await fetch(`/purchasing/cancel/${id}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken
                            }
                        });
                        const data = await res.json();
                        if (data.success) {
                            showToast({
                                type: 'success',
                                title: 'Berhasil',
                                message: data.message || 'Purchasing dibatalkan'
                            });
                            loadPurchasings();
                        } else {
                            showToast({
                                type: 'danger',
                                title: 'Gagal',
                                message: data.message || 'Gagal membatalkan purchasing'
                            });
                        }
                        return;
                    }

                    // === RETURN ===
                    if (btn.classList.contains('btn-return')) {
                        const id = btn.dataset.id;
                        const res = await fetch(`/purchasing/view/${id}`, {
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });
                        const data = await res.json();
                        if (!data.success) {
                            return showToast({
                                type: 'danger',
                                title: 'Error',
                                message: 'Gagal load detail'
                            });
                        }

                        const d = data.data;
                        const tableRows = d.items.map(i => `
                            <tr>
                                <td>${i.product?.name || '-'}</td>
                                <td>${i.qty}</td>
                                <td>${i.price.toLocaleString()}</td>
                                <td>${(i.qty * i.price).toLocaleString()}</td>
                                <td>
                                    <input type="number" class="form-control form-control-sm" 
                                        name="returnQty" min="0" max="${i.qty}" value="0"
                                        data-product-id="${i.productId}">
                                </td>
                            </tr>
                        `).join('');

                                            const html = `
                            <p><strong>Supplier:</strong> ${d.supplier?.name || '-'}</p>
                            <p><strong>Tanggal:</strong> ${new Date(d.date).toLocaleDateString()}</p>
                            <table class="table table-bordered">
                                <thead>
                                    <tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th><th>Qty Return</th></tr>
                                </thead>
                                <tbody>${tableRows}</tbody>
                            </table>
                        `;

                        document.getElementById('modalReturnContent').innerHTML = html;
                        document.getElementById('formReturnPurchasing').dataset.purchasingId = id;
                        new bootstrap.Modal(document.getElementById('modalReturnPurchasing')).show();
                        return;
                    }


                } catch (err) {
                    console.error(err);
                    showToast({
                        type: 'danger',
                        title: 'Error',
                        message: 'Gagal memproses aksi'
                    });
                }
            };
        });
    }

    document.getElementById('formReturnPurchasing').addEventListener('submit', async e => {
        e.preventDefault();
        const id = e.target.dataset.purchasingId;
        const inputs = e.target.querySelectorAll('input[name="returnQty"]');
        const items = [];

        inputs.forEach(inp => {
            const qty = parseFloat(inp.value);
            if (qty > 0) {
                items.push({
                    productId: inp.dataset.productId,
                    qty
                });
            }
        });

        if (items.length === 0) {
            return showToast({
                type: 'warning',
                title: 'Peringatan',
                message: 'Tidak ada item yang dikembalikan'
            });
        }

        try {
            const res = await fetch(`/purchasing/return/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    items
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast({
                    type: 'success',
                    title: 'Berhasil',
                    message: data.message || 'Return berhasil'
                });
                bootstrap.Modal.getInstance(document.getElementById('modalReturnPurchasing')).hide();
                loadPurchasings();
            } else {
                showToast({
                    type: 'danger',
                    title: 'Gagal',
                    message: data.message || 'Return gagal'
                });
            }
        } catch (err) {
            console.error(err);
            showToast({
                type: 'danger',
                title: 'Error',
                message: 'Gagal memproses return'
            });
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', e => {
            state.search = e.target.value;
            state.page = 1;
            loadPurchasings();
        });
    }

    function initPaginationUI(pagination) {
        const wrapper = document.querySelector('#purchasingPaginationWrapper');
        wrapper.innerHTML = '';

        const {
            page: current,
            totalPages: total,
            limit,
            totalItems: totalData
        } = pagination;

        const container = document.createElement('div');
        container.className = 'd-flex mt-3 gap-3 align-items-center justify-content-between flex-wrap';

        // Limit select
        const limitWrapper = document.createElement('div');
        limitWrapper.className = 'd-flex align-items-center';
        limitWrapper.style.minWidth = '180px';
        limitWrapper.innerHTML = `
        <label for="limitSelect" class="me-2 mb-0">Tampilkan:</label>
        <select id="limitSelect" class="form-select form-select-sm" style="width: auto;">
            ${[10, 25, 50].map(val => `<option value="${val}" ${val === limit ? 'selected' : ''}>${val}</option>`).join('')}
        </select>
    `;

        // Pagination
        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'Page navigation');
        nav.className = 'flex-grow-1 d-flex justify-content-center';
        const ul = document.createElement('ul');
        ul.className = 'pagination mb-0';

        const createPageItem = (n, text = null, disabled = false, active = false) => {
            const li = document.createElement('li');
            li.className = `page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
            li.innerHTML = `<a class="page-link" href="javascript:void(0);" data-page="${n}">${text || n}</a>`;
            return li;
        };

        // First & Prev
        ul.appendChild(createPageItem(1, '<i class="tf-icon bx bx-chevrons-left"></i>', current === 1));
        ul.appendChild(createPageItem(current - 1, '<i class="tf-icon bx bx-chevron-left"></i>', current === 1));

        // Page numbers with ellipsis
        if (current > 3) {
            ul.appendChild(createPageItem(1));
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = '<span class="page-link">...</span>';
            ul.appendChild(li);
        }
        for (let i = Math.max(current - 2, 1); i <= Math.min(current + 2, total); i++) {
            ul.appendChild(createPageItem(i, null, false, i === current));
        }
        if (current < total - 2) {
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = '<span class="page-link">...</span>';
            ul.appendChild(li);
            ul.appendChild(createPageItem(total));
        }

        // Next & Last
        ul.appendChild(createPageItem(current + 1, '<i class="tf-icon bx bx-chevron-right"></i>', current === total));
        ul.appendChild(createPageItem(total, '<i class="tf-icon bx bx-chevrons-right"></i>', current === total));

        nav.appendChild(ul);

        // Info
        const info = document.createElement('p');
        info.className = 'mb-0 text-nowrap';
        info.style.minWidth = '200px';
        info.textContent = `Halaman ${current} dari ${total} — Total ${totalData} data`;

        // Masukkan semua ke container
        container.appendChild(limitWrapper);
        container.appendChild(nav);
        container.appendChild(info);

        wrapper.appendChild(container);

        // Bind limit change
        const limitSelect = document.querySelector('#limitSelect');
        if (limitSelect) {
            limitSelect.onchange = e => {
                state.limit = parseInt(e.target.value);
                state.page = 1;
                loadPurchasings();
            };
        }

        // Bind page clicks
        wrapper.querySelectorAll('[data-page]').forEach(btn => {
            btn.onclick = () => {
                const page = parseInt(btn.dataset.page);
                if (!isNaN(page) && page >= 1 && page <= total) {
                    state.page = page;
                    loadPurchasings();
                }
            };
        });
    }

    loadPurchasings();
});
