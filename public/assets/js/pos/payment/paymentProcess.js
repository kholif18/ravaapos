// Payment/PaymentProcess - Core payment processing logic
import { POS } from '../core/state.js';
import { clearCart } from '../cart/cartManager.js';
import { formatCurrency } from '../utils/formatter.js';
import { showSuccess, showError, showWarning, confirmDialog } from '../ui/notifications.js';
import { saveTransaction } from '../transaction/transactionApi.js';
import { printReceipt } from './receiptPrinter.js';

// Payment state
let currentPayment = {
    method: null,
    amount: 0,
    change: 0,
    status: 'pending'
};

export async function processPayment(paymentData) {
    const { method, paidAmount, customerId, notes } = paymentData;
    const total = POS.getTotal();
    
    // Validate payment
    if (method === 'cash' && paidAmount < total) {
        showError(`Uang kurang ${formatCurrency(total - paidAmount)}`);
        return { success: false, error: 'Insufficient payment' };
    }
    
    currentPayment = {
        method,
        amount: paidAmount || total,
        change: method === 'cash' ? (paidAmount - total) : 0,
        status: 'completed',
        timestamp: new Date().toISOString(),
        notes
    };
    
    // Create transaction record
    const transaction = {
        id: generateTransactionId(),
        date: currentPayment.timestamp,
        customerId: customerId || null,
        customerName: POS.selectedCustomer?.name || 'Walk-in Customer',
        items: [...POS.cart],
        subtotal: POS.getSubtotal(),
        discount: POS.currentDiscount,
        tax: POS.getTax(),
        total: total,
        paymentMethod: method,
        paymentAmount: currentPayment.amount,
        change: currentPayment.change,
        status: 'completed',
        notes: notes || ''
    };
    
    try {
        // Save transaction
        await saveTransaction(transaction);
        
        // Show success
        showSuccessModal(transaction);
        
        // Print receipt
        const shouldPrint = await confirmPrint();
        if (shouldPrint) {
            printReceipt(transaction);
        }
        
        // Reset cart
        clearCart();
        resetDiscount();
        
        return { success: true, transaction };
    } catch (error) {
        console.error('Payment processing failed:', error);
        showError('Gagal memproses pembayaran');
        return { success: false, error: error.message };
    }
}

function generateTransactionId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV/${year}${month}${day}/${random}`;
}

function resetDiscount() {
    POS.currentDiscount = 0;
    const discountInput = document.getElementById('discountInput');
    if (discountInput) discountInput.value = 0;
}

function showSuccessModal(transaction) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Pembayaran Berhasil!',
            html: `
                <div style="text-align: center;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">✅</div>
                    <div style="font-size: 1.2rem; font-weight: bold;">${formatCurrency(transaction.total)}</div>
                    <div style="margin-top: 10px;">Metode: ${transaction.paymentMethod.toUpperCase()}</div>
                    <div>Customer: ${transaction.customerName}</div>
                    ${transaction.change > 0 ? `<div style="color: green;">Kembalian: ${formatCurrency(transaction.change)}</div>` : ''}
                    <div style="margin-top: 15px; font-size: 0.8rem; color: #666;">
                        No. Transaksi: ${transaction.id}
                    </div>
                </div>
            `,
            confirmButtonText: 'Cetak Struk',
            showCancelButton: true,
            cancelButtonText: 'Selesai'
        });
    } else {
        alert(`Pembayaran berhasil!\nTotal: ${formatCurrency(transaction.total)}\nNo: ${transaction.id}`);
    }
}

async function confirmPrint() {
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Cetak Struk?',
            text: 'Apakah ingin mencetak struk pembayaran?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Cetak',
            cancelButtonText: 'Tidak'
        });
        return result.isConfirmed;
    }
    return confirm('Cetak struk?');
}

// Payment method validations
export function validateCashPayment(paidAmount) {
    const total = POS.getTotal();
    if (paidAmount < total) {
        return { valid: false, message: `Uang kurang ${formatCurrency(total - paidAmount)}` };
    }
    return { valid: true, change: paidAmount - total };
}

export function validateCardPayment(cardData) {
    // Implement card validation logic
    return { valid: true };
}

export function validateQRISPayment(qrisData) {
    // Implement QRIS validation logic
    return { valid: true };
}

export function getPaymentSummary() {
    return {
        subtotal: POS.getSubtotal(),
        discount: POS.currentDiscount,
        tax: POS.getTax(),
        total: POS.getTotal(),
        ...currentPayment
    };
}

export function resetPayment() {
    currentPayment = {
        method: null,
        amount: 0,
        change: 0,
        status: 'pending'
    };
}