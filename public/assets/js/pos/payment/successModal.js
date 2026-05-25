// Payment/SuccessModal
import { POS } from '../core/state.js';
import { DOM } from '../core/dom.js';
import { clearCart } from '../cart/cartManager.js';
import { formatCurrency } from '../utils/formatter.js';
import { escapeHtml } from '../utils/escapeHtml.js';

export function showSuccessModal(orderNumber, transactionData) {
    createSuccessModal();
    
    const { total, change, paymentMethod, amountReceived } = transactionData;
    const isCash = paymentMethod === 'cash';
    const hasChange = change > 0;
    
    const methodNames = { cash: 'Tunai', card: 'Kartu', transfer: 'Transfer', qris: 'QRIS' };
    const methodIcons = { cash: 'bx-money', card: 'bx-credit-card', transfer: 'bx-transfer', qris: 'bx-qr' };
    
    const modalElement = document.getElementById('successModal');
    if (!modalElement) return;
    
    // Update modal content
    const orderSpan = document.getElementById('successOrderNumber');
    const changeCard = document.getElementById('successChangeCard');
    const changeAmount = document.getElementById('successChangeAmount');
    const totalSpan = document.getElementById('successTotal');
    const paidRow = document.getElementById('successPaidRow');
    const paidSpan = document.getElementById('successPaid');
    const methodSpan = document.getElementById('successMethod');
    
    if (orderSpan) orderSpan.textContent = `Order #${orderNumber}`;
    if (changeCard) changeCard.style.display = (isCash && hasChange) ? 'block' : 'none';
    if (changeAmount) changeAmount.textContent = formatCurrency(change);
    if (totalSpan) totalSpan.textContent = formatCurrency(total);
    if (paidRow) paidRow.style.display = isCash ? 'flex' : 'none';
    if (paidSpan) paidSpan.textContent = formatCurrency(amountReceived);
    if (methodSpan) methodSpan.innerHTML = `<i class="bx ${methodIcons[paymentMethod]}"></i> ${methodNames[paymentMethod]}`;
    
    // Set button handlers
    const printBtn = document.getElementById('printReceiptBtn');
    const newBtn = document.getElementById('newTransactionBtn');
    
    // Remove old listeners
    const newPrintBtn = printBtn?.cloneNode(true);
    const newNewBtn = newBtn?.cloneNode(true);
    if (printBtn && newPrintBtn) printBtn.parentNode?.replaceChild(newPrintBtn, printBtn);
    if (newBtn && newNewBtn) newBtn.parentNode?.replaceChild(newNewBtn, newBtn);
    
    newPrintBtn?.addEventListener('click', () => printReceipt(orderNumber, transactionData));
    newNewBtn?.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        
        // Reset POS State and UI
        clearCart();
        if (DOM.discountInput) DOM.discountInput.value = '0';
        
        // Trigger custom event for customer reset (handled in customerSearch.js)
        document.dispatchEvent(new CustomEvent('resetCustomer'));
        
        setTimeout(() => DOM.searchProduct?.focus(), 100);
    });
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function createSuccessModal() {
    if (document.getElementById('successModal')) return;
    
    const modalHtml = `
        <div class="modal fade" id="successModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center p-4">
                        <div class="success-icon mb-3">
                            <i class="bx bx-check-circle text-success" style="font-size: 64px;"></i>
                        </div>
                        <h4>PEMBAYARAN BERHASIL</h4>
                        <p class="text-muted" id="successOrderNumber">Order #0000</p>
                        <div id="successChangeCard" class="bg-light p-3 rounded mb-3" style="display: none;">
                            <small>KEMBALIAN</small>
                            <h3 id="successChangeAmount">Rp 0</h3>
                        </div>
                        <div class="payment-details bg-light p-3 rounded mb-3">
                            <div class="d-flex justify-content-between"><span>Total</span><span id="successTotal">Rp 0</span></div>
                            <div class="d-flex justify-content-between" id="successPaidRow" style="display: none;"><span>Dibayar</span><span id="successPaid">Rp 0</span></div>
                            <div class="d-flex justify-content-between"><span>Metode</span><span id="successMethod">Cash</span></div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-secondary flex-fill" id="printReceiptBtn"><i class="bx bx-printer"></i> Print</button>
                            <button class="btn btn-primary flex-fill" id="newTransactionBtn"><i class="bx bx-check-double"></i> Selesai</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

export function printReceipt(orderNumber, transactionData) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const now = new Date();
    const customerName = document.getElementById('selectedCustomerName')?.textContent || 'Walk-in Customer';
    
    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Struk #${orderNumber}</title>
        <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
            .header { text-align: center; border-bottom: 1px dashed #000; margin-bottom: 8px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
            .footer { text-align: center; border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; }
        </style>
        </head>
        <body>
            <div class="header"><h3>RAVA POS</h3><p>Jl. Toko Anda No. 123</p></div>
            <div>${now.toLocaleString()}</div>
            <div>Order #: ${orderNumber}</div>
            <div>Customer: ${customerName}</div>
            <div class="divider"></div>
            ${transactionData.items.map(item => `
                <div>${escapeHtml(item.name || 'Produk')} x ${item.quantity}</div>
                <div style="text-align: right">${formatCurrency(item.price * item.quantity)}</div>
            `).join('')}
            <div class="divider"></div>
            <div class="total-row"><span>Total</span><span>${formatCurrency(transactionData.total)}</span></div>
            ${transactionData.paymentMethod === 'cash' ? `<div class="total-row"><span>Dibayar</span><span>${formatCurrency(transactionData.amountReceived)}</span></div>` : ''}
            <div class="footer">Terima Kasih Atas Kunjungan Anda</div>
        </body>
        </html>
    `;
    
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
}