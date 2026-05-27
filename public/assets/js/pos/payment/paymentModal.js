// Payment/PaymentModal
import { DOM } from '../core/dom.js';
import { POS } from '../core/state.js';
import { clearCart } from '../cart/cartManager.js';
import { formatCurrency } from '../utils/formatter.js';
import { showSuccess, showWarning, showError, confirmDialog } from '../ui/notifications.js';
import { showSuccessModal } from './successModal.js';

let isProcessingPayment = false;

let debtToggle = null;
let debtDueDateInput = null;
let debtCustomerWarning = null;

export function initPromoHandlers() {
    if (!DOM.promoApplyBtn || !DOM.promoInput) return;

    DOM.promoApplyBtn.addEventListener('click', applyPromoCode);
    DOM.promoInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyPromoCode();
        }
    });
}

async function applyPromoCode() {
    const code = DOM.promoInput?.value?.trim();
    if (!code) {
        showError('Masukkan kode promo', 'Promo Kosong');
        return;
    }

    if (POS.cart.length === 0) {
        showError('Tambahkan produk sebelum memakai promo', 'Keranjang Kosong');
        return;
    }

    const totals = POS.calculateTotals();

    try {
        DOM.promoApplyBtn.disabled = true;
        const response = await fetch('/pos/apply-promo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
            },
            body: JSON.stringify({
                code,
                subtotal: totals.subtotal,
                items: POS.cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: Math.max(0, (item.price * item.quantity) - (item.discount || 0))
                }))
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Promo tidak valid');
        }

        POS.appliedPromo = result.promo;
        POS.currentDiscount = Number(result.discount) || 0;
        if (DOM.discountInput) DOM.discountInput.value = POS.currentDiscount;
        POS.saveToStorage();
        updateTotalsDisplay();
        showSuccess(result.message, result.promo.code);
    } catch (error) {
        POS.appliedPromo = null;
        POS.currentDiscount = 0;
        if (DOM.discountInput) DOM.discountInput.value = 0;
        POS.saveToStorage();
        updateTotalsDisplay();
        showError(error.message, 'Promo Gagal');
    } finally {
        DOM.promoApplyBtn.disabled = false;
    }
}

function updateTotalsDisplay() {
    const totals = POS.calculateTotals();
    if (DOM.subtotal) DOM.subtotal.textContent = formatCurrency(totals.subtotal);
    if (DOM.taxAmount) DOM.taxAmount.textContent = formatCurrency(totals.taxAmount);
    if (DOM.total) DOM.total.textContent = formatCurrency(totals.total);
    if (DOM.mobileTotal) DOM.mobileTotal.textContent = formatCurrency(totals.total);
}

export function initPaymentHandlers() {
    // Checkout button (F4)
    if (DOM.completeOrderBtn) {
        DOM.completeOrderBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong, tidak bisa checkout');
                return;
            }
            showPaymentModal(POS.getTotal());
        });
    }
    
    // Cash payment button (Quick access - F9 - Direct Exact Cash)
    if (DOM.cashPaymentBtn) {
        DOM.cashPaymentBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            processDirectCashPayment();
        });
    }

    // Quick Action Buttons from pos.ejs
    if (DOM.holdTransactionBtn) {
        DOM.holdTransactionBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            holdTransaction();
        });
    }

    if (DOM.resumeTransactionBtn) {
        DOM.resumeTransactionBtn.addEventListener('click', () => {
            resumeTransaction();
        });
    }

    if (DOM.voidTransactionBtn) {
        DOM.voidTransactionBtn.addEventListener('click', async () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }

            const confirmed = await confirmDialog(
                'Yakin ingin membatalkan seluruh transaksi ini?',
                'Konfirmasi Void'
            );

            if (confirmed.isConfirmed) {
                clearCart();
                showSuccess('Transaksi dibatalkan');
            }
        });
    }

    if (DOM.discountQuickBtn) {
        DOM.discountQuickBtn.addEventListener('click', () => {
            if (DOM.discountInput) {
                DOM.discountInput.focus();
                DOM.discountInput.select();
            }
        });
    }
}

async function processDirectCashPayment() {
    const total = POS.getTotal();

    if (typeof Swal === 'undefined') {
        await processTransaction(null, 'cash', true);
        return;
    }

    const result = await Swal.fire({
        title: 'Pembayaran Tunai',
        html: `
            <div class="pos-cash-confirm">
                <div class="pos-cash-icon"><i class="bx bx-money"></i></div>
                <div class="pos-cash-label">Tunai pas</div>
                <div class="pos-cash-total">${formatCurrency(total)}</div>
                <div class="pos-cash-note">Transaksi akan diproses tanpa kembalian.</div>
            </div>
        `,
        icon: null,
        showCancelButton: true,
        confirmButtonText: 'Proses Tunai',
        cancelButtonText: 'Batal',
        customClass: {
            popup: 'pos-swal-popup',
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-outline-secondary'
        },
        buttonsStyling: false,
        focusConfirm: true
    });

    if (result.isConfirmed) {
        await processTransaction(null, 'cash', true);
    }
}

export function holdTransaction() {
    if (POS.cart.length === 0) return;
    
    const holdData = {
        id: Date.now(),
        date: new Date().toISOString(),
        invoiceNumber: POS.currentInvoice,
        cart: [...POS.cart],
        customer: POS.selectedCustomer,
        discount: POS.currentDiscount,
        total: POS.getTotal()
    };
    
    const heldSales = JSON.parse(localStorage.getItem('pos_held_sales') || '[]');
    heldSales.push(holdData);
    localStorage.setItem('pos_held_sales', JSON.stringify(heldSales));
    
    clearCart();
    if (DOM.discountInput) DOM.discountInput.value = 0;
    refreshInvoiceNumber();
    showSuccess('Transaksi berhasil ditahan');
}

export function resumeTransaction() {
    const heldSales = JSON.parse(localStorage.getItem('pos_held_sales') || '[]');
    if (heldSales.length === 0) {
        showWarning('Tidak ada transaksi yang ditahan');
        return;
    }

    showResumeTransactionModal(heldSales);
}

function createResumeTransactionModal() {
    if (document.getElementById('resumeTransactionModal')) return;

    const modalHtml = `
        <div class="modal fade" id="resumeTransactionModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg resume-transaction-dialog">
                <div class="modal-content border-0 shadow-lg resume-transaction-content">
                    <div class="modal-header resume-transaction-header">
                        <div>
                            <h5 class="modal-title">
                                <i class="bx bx-history"></i>
                                Transaksi Ditahan
                            </h5>
                            <small>Pilih transaksi hold yang ingin dikembalikan ke cart</small>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body resume-transaction-body">
                        <div class="resume-search-wrap">
                            <i class="bx bx-search"></i>
                            <input type="search"
                                class="form-control"
                                id="heldTransactionSearch"
                                placeholder="Cari transaksi, customer, item, atau total..."
                                autocomplete="off">
                        </div>
                        <div class="resume-layout">
                            <div>
                                <div class="resume-section-title">Daftar transaksi</div>
                                <div id="heldTransactionList" class="held-transaction-list"></div>
                            </div>
                            <div>
                                <div class="resume-section-title">Preview</div>
                                <div id="heldTransactionDetail" class="held-transaction-detail"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer resume-transaction-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="resumeHeldBtn" disabled>
                            <i class="bx bx-reset"></i>
                            Kembalikan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showResumeTransactionModal(heldSales) {
    createResumeTransactionModal();

    const modalElement = document.getElementById('resumeTransactionModal');
    const searchInput = document.getElementById('heldTransactionSearch');
    const resumeBtn = document.getElementById('resumeHeldBtn');
    let selectedIndex = 0;

    const render = () => {
        const query = document.getElementById('heldTransactionSearch')?.value?.trim().toLowerCase() || '';
        const filtered = getFilteredHeldSales(heldSales, query);

        if (!filtered.some(entry => entry.index === selectedIndex)) {
            selectedIndex = filtered[0]?.index ?? null;
        }

        renderHeldTransactionList(filtered, selectedIndex);
        renderHeldTransactionDetail(heldSales[selectedIndex]);
        const activeResumeBtn = document.getElementById('resumeHeldBtn');
        if (activeResumeBtn) activeResumeBtn.disabled = selectedIndex === null || !heldSales[selectedIndex];
    };

    searchInput?.replaceWith(searchInput.cloneNode(true));
    const freshSearchInput = document.getElementById('heldTransactionSearch');
    freshSearchInput?.addEventListener('input', render);
    freshSearchInput.value = '';

    if (resumeBtn) {
        const freshResumeBtn = resumeBtn.cloneNode(true);
        resumeBtn.parentNode.replaceChild(freshResumeBtn, resumeBtn);
        freshResumeBtn.addEventListener('click', () => {
            if (selectedIndex === null || !heldSales[selectedIndex]) return;

            const selectedSale = heldSales.splice(selectedIndex, 1)[0];
            localStorage.setItem('pos_held_sales', JSON.stringify(heldSales));

            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();

            loadHeldTransaction(selectedSale);
        });
    }

    const listElement = document.getElementById('heldTransactionList');
    if (listElement) {
        listElement.onclick = (e) => {
            const item = e.target.closest('.held-sale-item');
            if (!item) return;

            selectedIndex = parseInt(item.dataset.index, 10);
            render();
        };
    }

    render();

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    setTimeout(() => freshSearchInput?.focus(), 250);
}

function getFilteredHeldSales(heldSales, query) {
    return heldSales
        .map((sale, index) => ({ sale, index }))
        .filter(({ sale }) => {
            if (!query) return true;
            const searchable = [
                sale.invoiceNumber,
                sale.customer?.name,
                formatCurrency(sale.total),
                new Date(sale.date).toLocaleString('id-ID'),
                ...sale.cart.map(item => item.name)
            ].join(' ').toLowerCase();

            return searchable.includes(query);
        });
}

function renderHeldTransactionList(entries, selectedIndex) {
    const list = document.getElementById('heldTransactionList');
    if (!list) return;

    if (entries.length === 0) {
        list.innerHTML = `
            <div class="held-sale-empty">
                <i class="bx bx-search-alt"></i>
                <span>Tidak ada transaksi yang cocok</span>
            </div>
        `;
        return;
    }

    list.innerHTML = entries.map(({ sale, index }) => createHeldTransactionCard(sale, index, selectedIndex)).join('');
}

function createHeldTransactionCard(sale, index, selectedIndex) {
    const date = new Date(sale.date);
    const customerName = sale.customer?.name || 'Walk-in Customer';
    const itemCount = sale.cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const firstItems = sale.cart.slice(0, 2).map(item => item.name).join(', ');

    return `
        <button type="button" class="held-sale-item ${index === selectedIndex ? 'active' : ''}" data-index="${index}">
            <div class="held-sale-main">
                <div>
                    <div class="held-sale-title">${escapeHtml(sale.invoiceNumber || `HOLD-${sale.id}`)}</div>
                    <div class="held-sale-time">${date.toLocaleString('id-ID')}</div>
                </div>
                <div class="held-sale-total">
                    <strong>${formatCurrency(sale.total)}</strong>
                    <span>${itemCount} item</span>
                </div>
            </div>
            <div class="held-sale-meta">
                <span><i class="bx bx-user"></i>${escapeHtml(customerName)}</span>
                <span>${escapeHtml(firstItems || '-')}</span>
            </div>
        </button>
    `;
}

function renderHeldTransactionDetail(sale) {
    const detail = document.getElementById('heldTransactionDetail');
    if (!detail) return;

    detail.innerHTML = sale ? createResumeTransactionDetail(sale) : `
        <div class="held-detail-empty">
            <i class="bx bx-receipt"></i>
            <span>Pilih transaksi untuk melihat preview</span>
        </div>
    `;
}

function createResumeTransactionDetail(sale) {
    const date = new Date(sale.date);
    const customerName = sale.customer?.name || 'Walk-in Customer';
    const items = sale.cart.map(item => {
        const qty = Number(item.quantity) || 1;
        const total = (Number(item.price) || 0) * qty;

        return `
        <div class="held-detail-item">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span>${qty} x ${formatCurrency(item.price || 0)}</span>
            </div>
            <b>${formatCurrency(total)}</b>
        </div>
    `;
    }).join('');

    return `
        <div class="held-detail-card">
            <div class="held-detail-meta">
                <div>
                    <small>Invoice</small>
                    <strong>${escapeHtml(sale.invoiceNumber || `HOLD-${sale.id}`)}</strong>
                </div>
            </div>
            <div class="held-detail-meta">
                <div>
                    <small>Waktu</small>
                    <strong>${date.toLocaleString('id-ID')}</strong>
                </div>
                <div>
                    <small>Customer</small>
                    <strong>${escapeHtml(customerName)}</strong>
                </div>
            </div>
            <div class="held-detail-items">${items}</div>
            <div class="held-detail-summary">
                <div>
                    <span>Diskon</span>
                    <strong>${formatCurrency(sale.discount || 0)}</strong>
                </div>
                <div class="total">
                    <span>Total</span>
                    <strong>${formatCurrency(sale.total)}</strong>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function loadHeldTransaction(sale) {
    POS.cart = sale.cart;
    POS.selectedCustomer = sale.customer;
    POS.currentDiscount = sale.discount;

    if (sale.invoiceNumber) {
        POS.setInvoice(sale.invoiceNumber);
    }
    
    if (DOM.discountInput) DOM.discountInput.value = sale.discount;
    
    // Refresh UI
    POS.saveToStorage();
    
    // Trigger UI updates
    document.dispatchEvent(new CustomEvent('resetCustomer'));
    
    import('../cart/cartRenderer.js').then(m => {
        m.renderCart();
        m.renderMobileCart();
    });

    showSuccess('Transaksi berhasil dikembalikan');
}

function createPaymentModal() {
    if (document.getElementById('paymentModal')) return;

    const modalHtml = `
        <div class="modal fade" id="paymentModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body p-4">
                        <div class="total-amount-card text-center mb-3 p-3 bg-primary text-white rounded">
                            <small>TOTAL BAYAR</small>
                            <h2 class="total-amount-value" id="paymentTotalAmount">Rp 0</h2>
                        </div>
                        
                        <!-- TAMBAHKAN: Opsi Pembayaran Hutang/DP -->
                        <div class="debt-options mb-3 p-3 bg-light rounded">
                            <div class="form-check form-switch mb-2">
                                <input type="checkbox" class="form-check-input" id="debtModeToggle">
                                <label class="form-check-label fw-semibold" for="debtModeToggle">
                                    <i class="bx bx-transfer-alt"></i> Bayar Nanti / Hutang
                                </label>
                            </div>
                            <div id="debtOptionsPanel" style="display: none;">
                                <div class="row g-2">
                                    <div class="col-md-6">
                                        <label class="form-label small">Jumlah Dibayar (DP)</label>
                                        <div class="input-group">
                                            <span class="input-group-text">Rp</span>
                                            <input type="number" class="form-control" id="debtPaymentAmount" min="0" step="1000" value="0">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small">Jatuh Tempo</label>
                                        <input type="date" class="form-control" id="debtDueDate">
                                    </div>
                                </div>
                                <div class="debt-summary mt-2 p-2 bg-white rounded small">
                                    <div class="d-flex justify-content-between">
                                        <span>Total:</span>
                                        <span id="debtTotalDisplay">Rp 0</span>
                                    </div>
                                    <div class="d-flex justify-content-between text-primary">
                                        <span>Dibayar:</span>
                                        <span id="debtPaidDisplay">Rp 0</span>
                                    </div>
                                    <div class="d-flex justify-content-between fw-bold">
                                        <span>Sisa Hutang:</span>
                                        <span id="debtRemainingDisplay">Rp 0</span>
                                    </div>
                                </div>
                                <div id="debtCustomerWarning" class="alert alert-warning small mt-2 mb-0" style="display: none;">
                                    <i class="bx bx-info-circle"></i> Customer wajib dipilih untuk transaksi hutang/DP
                                </div>
                            </div>
                        </div>
                        
                        <div class="payment-methods d-flex gap-2 mb-3">
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="cash"><i class="bx bx-money"></i> Cash</button>
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="card"><i class="bx bx-credit-card"></i> Card</button>
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="qris"><i class="bx bx-qr"></i> QRIS</button>
                            <button type="button" class="btn btn-outline-primary flex-fill" data-method="transfer"><i class="bx bx-transfer"></i> Transfer</button>
                        </div>
                        
                        <!-- Cash amount group (hanya tampil jika bukan mode hutang) -->
                        <div class="cash-amount-group">
                            <label class="form-label">Jumlah Dibayar</label>
                            <div class="input-group mb-2">
                                <span class="input-group-text">Rp</span>
                                <input type="number" class="form-control" id="paymentAmount" min="0" step="1000">
                            </div>
                            <div class="quick-amounts d-flex gap-2 mb-3">
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="round">Bulatkan</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="exact">Pas</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="50000">+50k</button>
                                <button type="button" class="btn btn-sm btn-outline-secondary flex-fill" data-quick="100000">+100k</button>
                            </div>
                            <div class="change-info p-2 bg-light rounded">
                                <small>Kembalian</small>
                                <h4 id="paymentChange" class="mb-0">Rp 0</h4>
                            </div>
                        </div>
                        <textarea class="form-control mt-3" id="paymentNotes" rows="2" placeholder="Catatan (opsional)..."></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-primary" id="confirmPaymentBtn" disabled>Bayar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Inisialisasi debt mode elements
    debtToggle = document.getElementById('debtModeToggle');
    debtDueDateInput = document.getElementById('debtDueDate');
    debtCustomerWarning = document.getElementById('debtCustomerWarning');

    // Set default due date +7 days
    if (debtDueDateInput) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        debtDueDateInput.value = defaultDate.toISOString().split('T')[0];
    }

    const modalElement = document.getElementById('paymentModal');
    if (modalElement) {
        modalElement.addEventListener('shown.bs.modal', function () {
            const paymentAmountInput = document.getElementById('paymentAmount');
            if (paymentAmountInput && document.querySelector('.cash-amount-group').style.display !== 'none') {
                paymentAmountInput.focus();
                paymentAmountInput.select();
            }
        });
    }
}

export function showPaymentModal(total) {
    createPaymentModal();
    
    const modalElement = document.getElementById('paymentModal');
    const totalSpan = document.getElementById('paymentTotalAmount');
    const changeSpan = document.getElementById('paymentChange');
    const cashGroup = document.querySelector('.cash-amount-group');
    const debtOptionsPanel = document.getElementById('debtOptionsPanel');
    const debtPaymentAmount = document.getElementById('debtPaymentAmount');
    const debtTotalDisplay = document.getElementById('debtTotalDisplay');
    const debtPaidDisplay = document.getElementById('debtPaidDisplay');
    const debtRemainingDisplay = document.getElementById('debtRemainingDisplay');
    
    if (!modalElement) return;
    
    let selectedMethod = 'cash';
    let isDebtMode = false;
    
    // Set total
    if (totalSpan) totalSpan.textContent = formatCurrency(total);
    
    // Set initial amount inputs
    const initialAmountInput = document.getElementById('paymentAmount');
    if (initialAmountInput) initialAmountInput.value = total;
    if (debtPaymentAmount) debtPaymentAmount.value = 0;
    if (debtTotalDisplay) debtTotalDisplay.textContent = formatCurrency(total);
    if (debtPaidDisplay) debtPaidDisplay.textContent = formatCurrency(0);
    if (debtRemainingDisplay) debtRemainingDisplay.textContent = formatCurrency(total);
    
    // ✅ Debt mode toggle handler
    if (debtToggle) {
        debtToggle.addEventListener('change', function() {
            isDebtMode = this.checked;
            
            if (isDebtMode) {
                debtOptionsPanel.style.display = 'block';
                cashGroup.style.display = 'none';
                
                // Reset payment method to cash for debt
                selectedMethod = 'cash';
                modalElement.querySelectorAll('[data-method]').forEach(btn => {
                    btn.classList.remove('active', 'btn-primary');
                    btn.classList.add('btn-outline-primary');
                });
                const cashBtn = modalElement.querySelector('[data-method="cash"]');
                if (cashBtn) {
                    cashBtn.classList.add('active', 'btn-primary');
                    cashBtn.classList.remove('btn-outline-primary');
                }
                
                updateDebtSummary(total);
            } else {
                debtOptionsPanel.style.display = 'none';
                cashGroup.style.display = 'block';
                updateDebtSummary(total);
            }
            
            // Update confirm button state
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            if (confirmBtn) {
                if (isDebtMode) {
                    // For debt mode, check if customer exists
                    const hasCustomer = POS.selectedCustomer?.id;
                    confirmBtn.disabled = !hasCustomer;
                } else {
                    confirmBtn.disabled = selectedMethod === 'cash' && parseFloat(document.getElementById('paymentAmount')?.value || 0) < total;
                }
            }
            
            // Show/hide customer warning
            if (debtCustomerWarning) {
                debtCustomerWarning.style.display = (isDebtMode && !POS.selectedCustomer?.id) ? 'block' : 'none';
            }
        });
    }
    
    // Update debt summary when DP amount changes
    if (debtPaymentAmount) {
        debtPaymentAmount.addEventListener('input', () => updateDebtSummary(total));
    }
    
    function updateDebtSummary(grandTotal) {
        const dpAmount = parseFloat(debtPaymentAmount?.value || 0);
        const paidAmount = isDebtMode ? dpAmount : (parseFloat(document.getElementById('paymentAmount')?.value || 0));
        const remaining = grandTotal - paidAmount;
        const paymentStatus = paidAmount >= grandTotal ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
        
        if (debtPaidDisplay) debtPaidDisplay.textContent = formatCurrency(paidAmount);
        if (debtRemainingDisplay) {
            debtRemainingDisplay.textContent = formatCurrency(remaining);
            debtRemainingDisplay.style.color = remaining > 0 ? '#e74c3c' : '#2ecc71';
        }
        
        // Store debt info for later use
        window._debtInfo = {
            isDebtMode,
            paidAmount,
            remaining,
            paymentStatus,
            dueDate: debtDueDateInput?.value || null
        };
    }
    
    // Calculate change for cash mode
    const calculateChange = () => {
        const activeAmountInput = document.getElementById('paymentAmount');
        const activeConfirmBtn = document.getElementById('confirmPaymentBtn');
        const received = parseFloat(activeAmountInput?.value) || 0;
        const change = received - total;

        if (changeSpan) {
            changeSpan.textContent = change < 0
                ? `Kurang ${formatCurrency(Math.abs(change))}`
                : formatCurrency(change);
            changeSpan.style.color = change >= 0 ? '#2ecc71' : '#e74c3c';
        }

        if (activeConfirmBtn && !isDebtMode) {
            activeConfirmBtn.disabled = selectedMethod === 'cash' && change < 0;
        }
        
        if (!isDebtMode) {
            updateDebtSummary(total);
        }
    };

    // Payment method selection
    modalElement.querySelectorAll('[data-method]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            if (isDebtMode) return; // Lock payment method in debt mode
            
            modalElement.querySelectorAll('[data-method]').forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline-primary');
            });
            newBtn.classList.add('active', 'btn-primary');
            newBtn.classList.remove('btn-outline-primary');
            selectedMethod = newBtn.dataset.method;
            
            const isCash = selectedMethod === 'cash';
            if (cashGroup && !isDebtMode) cashGroup.style.display = isCash ? 'block' : 'none';
            const activeConfirmBtn = document.getElementById('confirmPaymentBtn');
            if (activeConfirmBtn && !isDebtMode) activeConfirmBtn.disabled = false;
            
            const amountInput = document.getElementById('paymentAmount');
            if (isCash && amountInput && !isDebtMode) {
                amountInput.value = total;
                calculateChange();
                setTimeout(() => amountInput.focus(), 100);
            }
        });
    });
    
    // Quick amount buttons (cash mode)
    modalElement.querySelectorAll('[data-quick]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            if (isDebtMode) return;
            const amountInput = document.getElementById('paymentAmount');
            if (!amountInput) return;

            const quick = newBtn.dataset.quick;
            if (quick === 'round') {
                amountInput.value = Math.ceil(total / 1000) * 1000;
            } else if (quick === 'exact') {
                amountInput.value = total;
            } else {
                amountInput.value = total + parseInt(quick);
            }
            calculateChange();
        });
    });
    
    let newAmountInput = null;
    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) {
        newAmountInput = amountInput.cloneNode(true);
        amountInput.parentNode.replaceChild(newAmountInput, amountInput);
        newAmountInput.addEventListener('input', calculateChange);
        newAmountInput.addEventListener('keydown', (e) => {
            const activeConfirmBtn = document.getElementById('confirmPaymentBtn');
            if (e.key === 'Enter' && !activeConfirmBtn?.disabled) {
                confirmPayment(modalElement, total, selectedMethod);
            }
        });
    }
    
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', () => confirmPayment(modalElement, total, selectedMethod));
    
    // Set default active method
    const defaultBtn = modalElement.querySelector('[data-method="cash"]');
    if (defaultBtn) {
        defaultBtn.classList.add('active', 'btn-primary');
        defaultBtn.classList.remove('btn-outline-primary');
    }
    if (cashGroup) cashGroup.style.display = 'block';
    calculateChange();
    
    // Set default due date
    if (debtDueDateInput && !debtDueDateInput.value) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        debtDueDateInput.value = defaultDate.toISOString().split('T')[0];
    }
    
    // Check customer for debt mode warning on load
    if (debtCustomerWarning && debtToggle?.checked) {
        debtCustomerWarning.style.display = POS.selectedCustomer?.id ? 'none' : 'block';
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    setTimeout(() => {
        if (!debtToggle?.checked) {
            newAmountInput?.focus();
            newAmountInput?.select();
        } else {
            debtPaymentAmount?.focus();
        }
    }, 300);
}

async function confirmPayment(modalElement, total, selectedMethod) {
    const notes = document.getElementById('paymentNotes')?.value || '';
    const customerId = POS.selectedCustomer?.id || null;
    
    // ✅ Get debt info
    const debtInfo = window._debtInfo || {};
    const isDebtMode = debtToggle?.checked || false;
    
    let received = total;
    let change = 0;
    let paidAmount = total;
    
    if (isDebtMode) {
        // Debt/DP mode
        paidAmount = parseFloat(document.getElementById('debtPaymentAmount')?.value) || 0;
        received = paidAmount;
        change = 0;
        
        // Validate customer for debt
        if (!customerId) {
            showError('Customer wajib dipilih untuk transaksi hutang/DP', 'Validasi Gagal');
            return;
        }
        
        if (paidAmount < 0) {
            showError('Jumlah pembayaran tidak valid', 'Validasi Gagal');
            return;
        }
    } else if (selectedMethod === 'cash') {
        received = parseFloat(document.getElementById('paymentAmount')?.value) || 0;
        change = received - total;
        paidAmount = received;
        if (received < total) {
            showError('Pembayaran Kurang', 'Jumlah yang diterima kurang dari total');
            return;
        }
    } else {
        // Non-cash payment (card, qris, transfer)
        paidAmount = total;
        received = total;
        change = 0;
    }
    
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
    
    await processTransaction(null, selectedMethod, false, {
        total,
        amountReceived: received,
        change,
        notes,
        customerId,
        // ✅ Add debt data
        isDebtMode,
        paidAmount,
        dueDate: isDebtMode ? (debtDueDateInput?.value || null) : null,
        paymentStatus: isDebtMode ? (paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid')) : 'paid'
    });
}

async function processTransaction(modal, method, isDirect = false, directData = null) {
    if (isProcessingPayment) return;
    isProcessingPayment = true;

    const totals = POS.calculateTotals();
    
    const paymentData = isDirect ? {
        total: totals.total,
        amountReceived: totals.total,
        change: 0,
        notes: '',
        customerId: POS.selectedCustomer?.id || null,
        isDebtMode: false,
        paidAmount: totals.total,
        dueDate: null,
        paymentStatus: 'paid'
    } : directData;

    const transactionData = {
        invoiceNumber: POS.currentInvoice,
        customerId: paymentData.customerId,
        items: POS.cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            subtotal: Math.max(0, (item.price * item.quantity) - (item.discount || 0)),
            tax: item.tax || 0,
            discount: item.discount || 0,
            altDesc: item.altDesc || null
        })),
        subtotal: totals.subtotal,
        tax: totals.taxAmount,
        discount: totals.globalDiscount,
        total: paymentData.total,
        paymentMethod: method,
        amountReceived: paymentData.amountReceived,
        change: paymentData.change,
        notes: paymentData.notes,
        promoCode: POS.appliedPromo?.code || null,
        // ✅ Add debt fields
        paymentStatus: paymentData.paymentStatus,
        paidAmount: paymentData.paidAmount,
        remainingAmount: paymentData.total - paymentData.paidAmount,
        dueDate: paymentData.dueDate,
        isDebtMode: paymentData.isDebtMode
    };
    
    try {
        const response = await fetch('/pos/save-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
            },
            body: JSON.stringify(transactionData)
        });

        const result = await response.json();

        if (result.success) {
            clearCart();
            if (DOM.discountInput) DOM.discountInput.value = '0';
            if (DOM.promoInput) DOM.promoInput.value = '';
            document.dispatchEvent(new CustomEvent('resetCustomer'));
            refreshInvoiceNumber();
            
            // Reset debt mode
            if (debtToggle) debtToggle.checked = false;
            if (document.getElementById('debtOptionsPanel')) {
                document.getElementById('debtOptionsPanel').style.display = 'none';
            }
            
            showSuccessModal(result.invoiceNumber, transactionData);
        } else {
            showError('Error', result.message || 'Transaksi gagal');
        }
    } catch (error) {
        console.error('Transaction error:', error);
        showError('Error', 'Gagal menyimpan transaksi');
    } finally {
        isProcessingPayment = false;
    }
}

async function refreshInvoiceNumber() {
    try {
        const response = await fetch('/pos/next-invoice');
        const result = await response.json();

        if (result.success && result.invoiceNumber) {
            POS.setInvoice(result.invoiceNumber);
        }
    } catch (error) {
        console.error('Failed to refresh invoice number:', error);
    }
}
