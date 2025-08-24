import {
    initPagination
} from '../utils/initPagination.js';
import {
    showToast
} from '../utils/toast.js';

document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const tbody = document.querySelector('#purchasingTbody');

    const searchInput = document.getElementById('searchPurchasing');
    const resetBtn = document.getElementById('resetFilter');

    searchInput.addEventListener('input', () => {
        state.search = searchInput.value;
        state.page = 1;
        loadPurchasings();
    });

    resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.search = '';
        state.page = 1;
        loadPurchasings();
    });

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

                // Tentukan class status
                let statusClass = '';
                if (p.status === 'completed') statusClass = 'status-completed';
                else if (p.status === 'draft') statusClass = 'status-draft';
                else statusClass = 'status-cancelled';

                // Jika ada return
                const returnDot = p.returnQty > 0 ?
                    `<span class="status-dot status-returned ms-2" title="Returned ${p.returnQty}"></span>` :
                    '';

                row.innerHTML = `
                    <td>${startNumber + i}</td>
                    <td>${new Date(p.date).toLocaleDateString()}</td>
                    <td>${p.supplier?.name || '-'}</td>
                    <td>${p.total.toLocaleString()}</td>
                    <td>
                        <span class="status-dot ${statusClass}" title="${p.status}"></span>
                        ${returnDot}
                    </td>
                    <td>
                        <button class = "btn btn-sm btn-info btn-view" data-id="${p.id}" title="Lihat">
                        <i class="bx bx-show"></i></button>
                        ${p.status === 'draft' ? `
                            <button class="btn btn-sm btn-success btn-complete" data-id="${p.id}" title="Complete">
                                <i class="bx bx-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-cancel" data-id="${p.id}" title="Cancel">
                                <i class="bx bx-x"></i>
                            </button>
                        ` : p.status === 'completed' ? `
                            <button class="btn btn-sm btn-warning btn-return" data-id="${p.id}" title="Return">
                                <i class="bx bx-rotate-left"></i>
                            </button>
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

                        // Tentukan class status
                        let statusClass = '';
                        if (d.status === 'completed') statusClass = 'status-completed';
                        else if (d.status === 'draft') statusClass = 'status-draft';
                        else statusClass = 'status-cancelled';

                        // Cek apakah ada return
                        const hasReturn = d.items.some(i => i.returnQty && i.returnQty > 0);

                        const modal = document.getElementById('modalViewPurchasing');
                        const modalTitle = modal.querySelector('.modal-title');
                        modalTitle.innerHTML = `Detail Purchasing #${d.id}
                            ${d.notaNumber ? `<span class="badge bg-label-info ms-2">Nota: ${d.notaNumber}</span>` : ''}
                            ${d.notaFile ? `<button class="btn btn-sm btn-outline-primary ms-3" id="btnViewNota">
                                <i class="bx bx-file"></i> Lihat Nota
                            </button>` : ''}`;

                        if (d.notaFile) {
                            document.getElementById('btnViewNota').onclick = () => {

                                document.getElementById('notaPreviewImg').src = d.notaFile;
                                new bootstrap.Modal(document.getElementById('modalNota')).show();
                            };
                        }

                        const tableHeader = `
                            <tr>
                                <th>Produk</th>
                                <th>Qty</th>
                                ${hasReturn ? '<th class="text-danger">Return</th>' : ''}
                                <th>Harga</th>
                                <th>Subtotal</th>
                                ${hasReturn ? '<th>Subtotal Akhir</th>' : ''}
                            </tr>
                        `;

                            const tableRows = d.items.map(i => {
                                const subtotal = i.qty * i.price;
                                const subtotalAfter = (i.qty - (i.returnQty || 0)) * i.price;
                                return `
                                <tr>
                                    <td>${i.product?.name || '-'}</td>
                                    <td>${i.qty}</td>
                                    ${hasReturn
                                        ?`<td class="${i.returnQty > 0 ? 'text-danger' : ''}">-${i.returnQty || 0}</td>` 
                                        :''
                                    }

                                    <td>${i.price.toLocaleString()}</td>
                                    <td>${subtotal.toLocaleString()}</td>
                                    ${hasReturn ? `<td>${subtotalAfter.toLocaleString()}</td>` : ''}
                                </tr>
                            `;
                            }).join('');

                            const html = `
                            <div class="row mb-3">
                                <div class="col-md-3"><strong>Supplier: </strong><br>${d.supplier?.name || '-'}</div> 
                                <div class="col-md-3"><strong>Tanggal: </strong><br>${new Date(d.date).toLocaleDateString()}</div> 
                                <div class="col-md-3"><strong>Total: </strong><br>${d.total.toLocaleString()}</div> 
                                <div class="col-md-3"><strong>Status: </strong><br>
                                    <span class="status-dot ${statusClass}" title="${d.status}"></span> 
                                    ${d.status}
                                    ${d.returnQty > 0 ? `<span class="badge bg-danger ms-2">return</span>` : ''}
                                </div> 
                            </div>

                            ${d.returnQty > 0 ? `
                                <div class="row mb-3">
                                    <div class="col-md-12 text-danger">
                                        <strong>Total Return:</strong> -${d.returnQty} item<br>
                                    </div>
                                </div>
                            ` : ''}

                            <table class="table table-sm table-bordered">
                                <thead>${tableHeader}</thead>
                                <tbody>${tableRows}</tbody>
                            </table>

                            <hr>
                            <p>
                                <strong>Catatan: </strong><br>
                                ${d.note 
                                    ? d.note
                                    .split('|') 
                                    .map(n => n.trim())
                                    .map(n => {
                                        if (n.startsWith('RETURN:')) {
                                            return `<div class="p-2 my-1 bg-label-danger text-danger">
                                        ${n.replace(/\n/g, '<br>')}
                                    </div>`;
                                        }
                                        return `<div class="my-1">${n.replace(/\n/g, '<br>')}</div>`;
                                    })
                                    .join(''): '-'
                                }
                            </p>
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

                            <div class="mb-3">
                                <label for="returnNote" class="form-label">Catatan Return</label> 
                                <textarea id="returnNote" name="returnNote" class="form-control" rows="3"
                                placeholder="Masukkan catatan pengembalian..."></textarea> 
                            </div>
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

        const form = e.target;
        const purchasingId = form.dataset.purchasingId;
        const inputs = form.querySelectorAll('input[name="returnQty"]');
        const note = form.querySelector('#returnNote')?.value.trim() || '';

        // Ambil item yang dikembalikan
        const items = Array.from(inputs)
            .map(inp => ({
                productId: inp.dataset.productId,
                qty: parseFloat(inp.value)
            }))
            .filter(i => i.qty > 0);

        if (!items.length) {
            return showToast({
                type: 'warning',
                title: 'Peringatan',
                message: 'Tidak ada item yang dikembalikan'
            });
        }

        const payload = {
            items,
            note
        };

        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Menyimpan...';

        try {
            const res = await fetch(`/purchasing/return/${purchasingId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify(payload)
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
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Simpan Return';
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
