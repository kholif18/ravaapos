// Payment/MobilePaymentSheet
import { POS } from '../core/state.js';
import { formatCurrency } from '../utils/formatter.js';
import { escapeHtml } from '../utils/escapeHtml.js';

let mpsActiveMethod = 'cash';
let mpsIsDebtMode = false;

export function createMobilePaymentSheet() {
    if (document.getElementById('mobilePaymentSheet')) return;

    const html = `
        <div id="mobilePaymentSheet" class="mobile-payment-sheet">
            <div class="mps-header">
                <button class="btn-mps-back" id="mpsBackBtn"><i class="bx bx-chevron-left"></i></button>
                <h5>Pembayaran</h5>
                <div style="width: 40px;"></div>
            </div>
            <div class="mps-body">
                <div class="mps-total-card">
                    <small>TOTAL TAGIHAN</small>
                    <h2 id="mpsTotalAmount">Rp 0</h2>
                </div>

                <div class="mps-debt-card">
                    <div class="form-check form-switch d-flex justify-content-between align-items-center p-0">
                        <label class="form-check-label fw-bold" for="mpsDebtToggle">
                            <i class="bx bx-transfer-alt me-1"></i> Bayar Nanti / Hutang
                        </label>
                        <input type="checkbox" class="form-check-input ms-0" id="mpsDebtToggle">
                    </div>
                    <div id="mpsDebtOptions" class="mps-debt-options" style="display: none;">
                        <div class="mps-debt-row">
                            <div class="mps-debt-col">
                                <label class="mps-debt-label">DP / Dibayar</label>
                                <input type="number" id="mpsDebtAmount" class="mps-debt-input" value="0">
                            </div>
                            <div class="mps-debt-col">
                                <label class="mps-debt-label">Jatuh Tempo</label>
                                <input type="date" id="mpsDebtDueDate" class="mps-debt-input">
                            </div>
                        </div>
                        <div id="mpsDebtWarning" class="alert alert-warning p-2 mt-2 mb-0" style="font-size: 0.75rem; display: none;">
                            <i class="bx bx-info-circle"></i> Customer wajib dipilih
                        </div>
                    </div>
                </div>

                <span class="mps-section-title">Metode Pembayaran</span>
                <div class="mps-method-grid">
                    <button class="mps-method-btn active" data-method="cash">
                        <i class="bx bx-money"></i>
                        <span>Tunai</span>
                    </button>
                    <button class="mps-method-btn" data-method="card">
                        <i class="bx bx-credit-card"></i>
                        <span>Kartu</span>
                    </button>
                    <button class="mps-method-btn" data-method="qris">
                        <i class="bx bx-qr"></i>
                        <span>QRIS</span>
                    </button>
                    <button class="mps-method-btn" data-method="transfer">
                        <i class="bx bx-transfer"></i>
                        <span>Transfer</span>
                    </button>
                </div>

                <div id="mpsCashSection">
                    <span class="mps-section-title">Jumlah Diterima</span>
                    <div class="mps-input-group">
                        <input type="number" id="mpsAmountInput" class="mps-amount-input" placeholder="0">
                        <div class="mps-quick-amounts">
                            <button class="mps-quick-btn" data-quick="exact">Pas</button>
                            <button class="mps-quick-btn" data-quick="50000">+50k</button>
                            <button class="mps-quick-btn" data-quick="100000">+100k</button>
                        </div>
                    </div>

                    <div class="mps-change-box">
                        <span>Kembalian</span>
                        <h4 id="mpsChangeAmount">Rp 0</h4>
                    </div>
                </div>

                <div class="mb-3">
                    <span class="mps-section-title">Catatan</span>
                    <textarea id="mpsNotes" class="form-control" rows="2" placeholder="Catatan transaksi..."></textarea>
                </div>
            </div>
            <div class="mps-footer">
                <button id="mpsCheckoutBtn" class="btn-mps-checkout">
                    <span>BAYAR SEKARANG</span>
                    <span id="mpsPayAmountLabel">Rp 0</span>
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    bindMobilePaymentEvents();
}

export function showMobilePaymentSheet(total) {
    createMobilePaymentSheet();
    
    const sheet = document.getElementById('mobilePaymentSheet');
    const totalEl = document.getElementById('mpsTotalAmount');
    const amountInput = document.getElementById('mpsAmountInput');
    const checkoutBtn = document.getElementById('mpsCheckoutBtn');
    const payLabel = document.getElementById('mpsPayAmountLabel');
    const debtDueDate = document.getElementById('mpsDebtDueDate');

    // Reset state
    mpsActiveMethod = 'cash';
    mpsIsDebtMode = false;
    document.getElementById('mpsDebtToggle').checked = false;
    document.getElementById('mpsDebtOptions').style.display = 'none';
    document.getElementById('mpsCashSection').style.display = 'block';
    document.getElementById('mpsNotes').value = '';
    
    // Set values
    totalEl.textContent = formatCurrency(total);
    payLabel.textContent = formatCurrency(total);
    amountInput.value = total;
    
    // Set default due date
    if (debtDueDate) {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        debtDueDate.value = date.toISOString().split('T')[0];
    }

    // Show sheet
    sheet.classList.add('active');
    document.body.classList.add('body-scroll-lock');
    
    updateMpsChange(total);
    
    setTimeout(() => {
        amountInput.focus();
        amountInput.select();
    }, 350);
}

export function hideMobilePaymentSheet() {
    const sheet = document.getElementById('mobilePaymentSheet');
    if (sheet) {
        sheet.classList.remove('active');
        document.body.classList.remove('body-scroll-lock');
    }
}

function bindMobilePaymentEvents() {
    const backBtn = document.getElementById('mpsBackBtn');
    const debtToggle = document.getElementById('mpsDebtToggle');
    const amountInput = document.getElementById('mpsAmountInput');
    const debtAmountInput = document.getElementById('mpsDebtAmount');
    const methodBtns = document.querySelectorAll('.mps-method-btn');
    const quickBtns = document.querySelectorAll('.mps-quick-btn');
    const checkoutBtn = document.getElementById('mpsCheckoutBtn');

    backBtn.onclick = hideMobilePaymentSheet;

    debtToggle.onchange = function() {
        mpsIsDebtMode = this.checked;
        const options = document.getElementById('mpsDebtOptions');
        const cashSection = document.getElementById('mpsCashSection');
        const warning = document.getElementById('mpsDebtWarning');
        
        options.style.display = mpsIsDebtMode ? 'block' : 'none';
        cashSection.style.display = mpsIsDebtMode ? 'none' : 'block';
        
        if (mpsIsDebtMode) {
            mpsActiveMethod = 'cash';
            updateMethodUI('cash');
            warning.style.display = POS.selectedCustomer?.id ? 'none' : 'block';
        }
        
        updateMpsChange(POS.getTotal());
    };

    methodBtns.forEach(btn => {
        btn.onclick = function() {
            if (mpsIsDebtMode) return;
            
            const method = this.dataset.method;
            mpsActiveMethod = method;
            updateMethodUI(method);
            
            const cashSection = document.getElementById('mpsCashSection');
            cashSection.style.display = method === 'cash' ? 'block' : 'none';
            
            updateMpsChange(POS.getTotal());
        };
    });

    amountInput.oninput = () => updateMpsChange(POS.getTotal());
    debtAmountInput.oninput = () => updateMpsChange(POS.getTotal());

    quickBtns.forEach(btn => {
        btn.onclick = function() {
            const quick = this.dataset.quick;
            const total = POS.getTotal();
            if (quick === 'exact') {
                amountInput.value = total;
            } else {
                amountInput.value = total + parseInt(quick);
            }
            updateMpsChange(total);
        };
    });

    checkoutBtn.onclick = function() {
        if (this.disabled) return;
        
        // Trigger confirmPayment from paymentModal.js (passed via global or event)
        const event = new CustomEvent('mpsConfirmPayment', {
            detail: {
                method: mpsActiveMethod,
                isDebt: mpsIsDebtMode,
                notes: document.getElementById('mpsNotes').value,
                amountReceived: mpsIsDebtMode ? parseFloat(debtAmountInput.value || 0) : parseFloat(amountInput.value || 0),
                dueDate: document.getElementById('mpsDebtDueDate').value
            }
        });
        document.dispatchEvent(event);
    };
    
    // Auto submit on Enter
    amountInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !checkoutBtn.disabled) checkoutBtn.click();
    };
}

function updateMethodUI(activeMethod) {
    document.querySelectorAll('.mps-method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === activeMethod);
    });
}

function updateMpsChange(total) {
    const amountInput = document.getElementById('mpsAmountInput');
    const debtAmountInput = document.getElementById('mpsDebtAmount');
    const changeEl = document.getElementById('mpsChangeAmount');
    const checkoutBtn = document.getElementById('mpsCheckoutBtn');
    
    const received = mpsIsDebtMode ? parseFloat(debtAmountInput.value || 0) : parseFloat(amountInput.value || 0);
    const change = received - total;

    if (changeEl) {
        changeEl.textContent = change < 0 ? `Kurang ${formatCurrency(Math.abs(change))}` : formatCurrency(change);
        changeEl.style.color = change >= 0 ? '#2ecc71' : '#e74c3c';
    }

    if (checkoutBtn) {
        let disabled = false;
        if (mpsIsDebtMode) {
            disabled = !POS.selectedCustomer?.id;
        } else if (mpsActiveMethod === 'cash') {
            disabled = change < 0;
        }
        checkoutBtn.disabled = disabled;
    }
}
