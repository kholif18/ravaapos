// Payment/PaymentModal
import { DOM } from '../core/dom.js';
import { POS } from '../core/state.js';
import { clearCart } from '../cart/cartManager.js';
import { formatRupiah } from '../utils/currency.js';
import { showSuccess, showWarning } from '../ui/notifications.js';

export function initPaymentHandlers() {
    // Checkout button
    if (DOM.completeOrderBtn) {
        DOM.completeOrderBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong, tidak bisa checkout');
                return;
            }
            showPaymentModal();
        });
    }
    
    // Payment method buttons
    if (DOM.cashPaymentBtn) {
        DOM.cashPaymentBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            showCashPaymentModal();
        });
    }
    
    if (DOM.cardPaymentBtn) {
        DOM.cardPaymentBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            processPayment('card');
        });
    }
    
    if (DOM.qrisPaymentBtn) {
        DOM.qrisPaymentBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            processPayment('qris');
        });
    }
    
    if (DOM.transferPaymentBtn) {
        DOM.transferPaymentBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            processPayment('transfer');
        });
    }
    
    // Discount quick button
    if (DOM.discountQuickBtn) {
        DOM.discountQuickBtn.addEventListener('click', () => {
            if (DOM.discountInput) DOM.discountInput.focus();
        });
    }
    
    // Void transaction button
    if (DOM.voidTransactionBtn) {
        DOM.voidTransactionBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            confirmDialog('Yakin ingin membatalkan seluruh transaksi?', 'Konfirmasi Void')
                .then((result) => {
                    if (result.isConfirmed) {
                        clearCart();
                        showSuccess('Transaksi dibatalkan');
                    }
                });
        });
    }
    
    // Hold transaction button
    if (DOM.holdTransactionBtn) {
        DOM.holdTransactionBtn.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang kosong');
                return;
            }
            holdTransaction();
        });
    }
    
    // Resume transaction button
    if (DOM.resumeTransactionBtn) {
        DOM.resumeTransactionBtn.addEventListener('click', () => {
            resumeTransaction();
        });
    }
}

function showPaymentModal() {
    const total = POS.getTotal();
    
    if (typeof Swal === 'undefined') {
        processPayment('cash');
        return;
    }
    
    Swal.fire({
        title: 'Pembayaran',
        html: `
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #696cff; margin-bottom: 20px;">
                    ${formatRupiah(total)}
                </div>
                <div class="payment-methods" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
                    <button class="btn btn-primary" id="modalCashBtn" style="margin: 5px;">💰 Cash</button>
                    <button class="btn btn-primary" id="modalCardBtn" style="margin: 5px;">💳 Card</button>
                    <button class="btn btn-primary" id="modalQrisBtn" style="margin: 5px;">📱 QRIS</button>
                    <button class="btn btn-primary" id="modalTransferBtn" style="margin: 5px;">🏦 Transfer</button>
                </div>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Batal',
        didOpen: (modal) => {
            modal.querySelector('#modalCashBtn')?.addEventListener('click', () => {
                Swal.close();
                showCashPaymentModal();
            });
            modal.querySelector('#modalCardBtn')?.addEventListener('click', () => {
                Swal.close();
                processPayment('card');
            });
            modal.querySelector('#modalQrisBtn')?.addEventListener('click', () => {
                Swal.close();
                processPayment('qris');
            });
            modal.querySelector('#modalTransferBtn')?.addEventListener('click', () => {
                Swal.close();
                processPayment('transfer');
            });
        }
    });
}

function showCashPaymentModal() {
    const total = POS.getTotal();
    
    if (typeof Swal === 'undefined') {
        const amount = prompt(`Total pembayaran: ${formatRupiah(total)}\nMasukkan jumlah uang:`);
        if (amount) {
            const paid = parseInt(amount.replace(/[^0-9]/g, '')) || 0;
            if (paid >= total) {
                const change = paid - total;
                alert(`Kembalian: ${formatRupiah(change)}`);
                processPayment('cash');
            } else {
                alert('Uang kurang!');
            }
        }
        return;
    }
    
    Swal.fire({
        title: 'Pembayaran Tunai',
        html: `
            <div style="text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 15px;">
                    Total: <strong>${formatRupiah(total)}</strong>
                </div>
                <div class="input-group" style="margin-bottom: 15px;">
                    <span class="input-group-text">Rp</span>
                    <input type="text" class="form-control" id="cashAmountInput" placeholder="Masukkan jumlah uang" style="font-size: 1.2rem; text-align: right;">
                </div>
                <div id="changeDisplay" style="font-size: 1rem; color: #666;"></div>
            </div>
        `,
        showConfirmButton: true,
        showCancelButton: true,
        confirmButtonText: 'Bayar',
        cancelButtonText: 'Batal',
        didOpen: (modal) => {
            const input = modal.querySelector('#cashAmountInput');
            if (input) {
                input.focus();
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/[^0-9]/g, '');
                    e.target.value = formatNumberInput(value);
                    const paid = parseInt(value) || 0;
                    const change = paid - total;
                    const changeDisplay = modal.querySelector('#changeDisplay');
                    if (changeDisplay) {
                        if (paid >= total) {
                            changeDisplay.innerHTML = `<span style="color: green;">Kembalian: ${formatRupiah(change)}</span>`;
                        } else if (paid > 0) {
                            changeDisplay.innerHTML = `<span style="color: red;">Kurang: ${formatRupiah(Math.abs(change))}</span>`;
                        } else {
                            changeDisplay.innerHTML = '';
                        }
                    }
                });
            }
        },
        preConfirm: () => {
            const input = document.getElementById('cashAmountInput');
            const paid = parseInt(input?.value.replace(/[^0-9]/g, '')) || 0;
            if (paid < total) {
                Swal.showValidationMessage(`Uang kurang! ${formatRupiah(total - paid)} lagi`);
                return false;
            }
            return { paid };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const paid = result.value?.paid || total;
            const change = paid - total;
            if (change > 0) {
                showSuccess(`Kembalian: ${formatRupiah(change)}`);
            }
            processPayment('cash');
        }
    });
}

function formatNumberInput(value) {
    if (!value) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(value));
}

function processPayment(method) {
    const total = POS.getTotal();
    const customerName = POS.selectedCustomer?.name || 'Walk-in Customer';
    const receiptNumber = generateReceiptNumber();
    
    // Save transaction to localStorage (simulasi)
    const transaction = {
        id: receiptNumber,
        date: new Date().toISOString(),
        customer: customerName,
        items: [...POS.cart],
        subtotal: POS.getSubtotal(),
        discount: POS.currentDiscount,
        tax: POS.getTax(),
        total: total,
        paymentMethod: method
    };
    
    saveTransaction(transaction);
    
    // Show success modal
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Pembayaran Berhasil!',
            html: `
                <div style="text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
                    <div><strong>${formatRupiah(total)}</strong></div>
                    <div style="margin-top: 10px;">Metode: ${method.toUpperCase()}</div>
                    <div>Customer: ${customerName}</div>
                    <div style="margin-top: 15px; font-size: 0.8rem; color: #666;">
                        No. Transaksi: ${receiptNumber}
                    </div>
                </div>
            `,
            confirmButtonText: 'Cetak Struk',
            showCancelButton: true,
            cancelButtonText: 'Selesai'
        }).then((result) => {
            if (result.isConfirmed) {
                printReceipt(transaction);
            }
            resetTransaction();
        });
    } else {
        alert(`Pembayaran ${method.toUpperCase()} berhasil!\nTotal: ${formatRupiah(total)}\nNo. Transaksi: ${receiptNumber}`);
        resetTransaction();
    }
}

function generateReceiptNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV/${year}${month}${day}/${random}`;
}

function saveTransaction(transaction) {
    const transactions = JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    transactions.unshift(transaction);
    // Keep only last 100 transactions
    if (transactions.length > 100) transactions.pop();
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
}

function printReceipt(transaction) {
    const receiptHtml = generateReceiptHTML(transaction);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    }
}

function generateReceiptHTML(transaction) {
    const items = transaction.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td style="text-align: center;">${item.quantity}x</td>
            <td style="text-align: right;">${formatRupiah(item.price)}</td>
            <td style="text-align: right;">${formatRupiah(item.price * item.quantity)}</td>
        </tr>
    `).join('');
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk Pembayaran</title>
            <style>
                body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 20px; }
                table { width: 100%; margin: 10px 0; border-collapse: collapse; }
                th, td { padding: 4px; border-bottom: 1px dotted #ccc; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h3 { margin: 0; }
                .total { margin-top: 10px; padding-top: 10px; border-top: 1px solid #000; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h3>TOKO KAMI</h3>
                <p>${new Date(transaction.date).toLocaleString('id-ID')}</p>
                <small>${transaction.id}</small>
            </div>
            <table>
                <thead>
                    <tr><th>Item</th><th>Qty</th><th>Harga</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${items}
                </tbody>
            </table>
            <div class="total">
                <div>Subtotal: ${formatRupiah(transaction.subtotal)}</div>
                <div>Diskon: ${formatRupiah(transaction.discount)}</div>
                <div>Tax: ${formatRupiah(transaction.tax)}</div>
                <div><strong>TOTAL: ${formatRupiah(transaction.total)}</strong></div>
                <div>Pembayaran: ${transaction.paymentMethod.toUpperCase()}</div>
            </div>
            <div class="footer">
                <p>Terima kasih atas kunjungan Anda</p>
                <p>💳 ⭐ 🛍️</p>
            </div>
        </body>
        </html>
    `;
}

function resetTransaction() {
    clearCart();
    if (DOM.discountInput) DOM.discountInput.value = 0;
    POS.currentDiscount = 0;
}

// Hold sale functions
let heldSales = JSON.parse(localStorage.getItem('pos_held_sales') || '[]');

function holdTransaction() {
    if (POS.cart.length === 0) {
        showWarning('Keranjang kosong');
        return;
    }
    
    const holdData = {
        id: Date.now(),
        date: new Date().toISOString(),
        cart: [...POS.cart],
        discount: POS.currentDiscount,
        customer: POS.selectedCustomer,
        total: POS.getTotal()
    };
    
    heldSales.push(holdData);
    localStorage.setItem('pos_held_sales', JSON.stringify(heldSales));
    
    clearCart();
    if (DOM.discountInput) DOM.discountInput.value = 0;
    POS.currentDiscount = 0;
    
    showSuccess('Transaksi disimpan', 'Hold Sale');
}

function resumeTransaction() {
    if (heldSales.length === 0) {
        showWarning('Tidak ada transaksi yang ditahan');
        return;
    }
    
    if (typeof Swal !== 'undefined') {
        const saleOptions = heldSales.map((sale, index) => ({
            id: index,
            text: `${new Date(sale.date).toLocaleString()} - ${formatRupiah(sale.total)} (${sale.cart.length} item)`
        }));
        
        Swal.fire({
            title: 'Pilih Transaksi',
            input: 'select',
            inputOptions: saleOptions.reduce((acc, opt) => {
                acc[opt.id] = opt.text;
                return acc;
            }, {}),
            inputPlaceholder: 'Pilih transaksi',
            showCancelButton: true,
            confirmButtonText: 'Resume',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed && result.value !== undefined) {
                const selected = heldSales[parseInt(result.value)];
                if (selected) {
                    loadHeldTransaction(selected);
                }
            }
        });
    } else {
        const list = heldSales.map((s, i) => `${i + 1}. ${new Date(s.date).toLocaleString()} - ${formatRupiah(s.total)}`).join('\n');
        const choice = prompt(`Pilih transaksi:\n${list}\n\nMasukkan nomor:`);
        if (choice) {
            const idx = parseInt(choice) - 1;
            if (heldSales[idx]) {
                loadHeldTransaction(heldSales[idx]);
            }
        }
    }
}

function loadHeldTransaction(holdData) {
    clearCart();
    holdData.cart.forEach(item => {
        POS.cart.push({ ...item });
    });
    POS.currentDiscount = holdData.discount;
    if (DOM.discountInput) DOM.discountInput.value = holdData.discount;
    POS.selectedCustomer = holdData.customer;
    if (holdData.customer) {
        renderSelectedCustomer(holdData.customer);
    }
    
    // Remove from held sales
    heldSales = heldSales.filter(s => s.id !== holdData.id);
    localStorage.setItem('pos_held_sales', JSON.stringify(heldSales));
    
    // Trigger re-render
    const event = new CustomEvent('cartUpdated');
    document.dispatchEvent(event);
    
    showSuccess('Transaksi dimuat kembali');
}

// Re-export untuk digunakan di file lain
export function renderSelectedCustomer(customer) {
    const nameEl = DOM.selectedCustomerName;
    const phoneEl = DOM.selectedCustomerPhone;
    const badgeEl = DOM.customerBadge;
    const clearBtn = DOM.clearCustomerBtn;
    
    if (!nameEl) return;
    
    if (!customer) {
        nameEl.textContent = 'Walk-in Customer';
        if (phoneEl) phoneEl.innerHTML = '<i class="bx bx-phone"></i><span>Customer umum / non member</span>';
        if (badgeEl) {
            badgeEl.textContent = 'UMUM';
            badgeEl.classList.remove('member-badge');
        }
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    
    nameEl.textContent = customer.name;
    if (phoneEl) phoneEl.innerHTML = `<i class="bx bx-phone"></i><span>${customer.phone || '-'}</span>`;
    if (badgeEl) {
        badgeEl.textContent = customer.type === 'member' ? 'MEMBER' : 'UMUM';
        if (customer.type === 'member') {
            badgeEl.classList.add('member-badge');
        } else {
            badgeEl.classList.remove('member-badge');
        }
    }
    if (clearBtn) clearBtn.style.display = 'inline-flex';
}