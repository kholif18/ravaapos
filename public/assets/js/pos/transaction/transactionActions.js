// Transaction/TransactionActions - Actions for transaction management
import {
    POS
} from '../core/state.js';
import {
    clearCart
} from '../cart/cartManager.js';
import {
    showSuccess,
    showError,
    showWarning,
    confirmDialog
} from '../ui/notifications.js';
import {
    formatCurrency
} from '../utils/formatter.js';

// Transaction state
let currentTransaction = null;
let isTransactionLocked = false;
let heldTransactions = [];

// Load held transactions from storage
export function loadHeldTransactions() {
    try {
        const saved = localStorage.getItem('pos_held_transactions');
        if (saved) {
            heldTransactions = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load held transactions:', error);
        heldTransactions = [];
    }
    return heldTransactions;
}

function saveHeldTransactions() {
    localStorage.setItem('pos_held_transactions', JSON.stringify(heldTransactions));
}

// Hold current transaction
export function holdTransaction() {
    if (POS.cart.length === 0) {
        showWarning('Tidak ada transaksi untuk di-hold');
        return false;
    }

    const holdData = {
        id: Date.now(),
        date: new Date().toISOString(),
        cart: JSON.parse(JSON.stringify(POS.cart)),
        discount: POS.currentDiscount,
        customer: POS.selectedCustomer ? JSON.parse(JSON.stringify(POS.selectedCustomer)) : null,
        subtotal: POS.getSubtotal(),
        total: POS.getTotal(),
        notes: ''
    };

    heldTransactions.push(holdData);
    saveHeldTransactions();

    // Clear current transaction
    clearCart();
    POS.currentDiscount = 0;
    const discountInput = document.getElementById('discountInput');
    if (discountInput) discountInput.value = 0;

    showSuccess('Transaksi disimpan', 'Hold Sale');
    return true;
}

// Resume a held transaction
export function resumeTransaction(transactionId = null) {
    if (heldTransactions.length === 0) {
        showWarning('Tidak ada transaksi yang ditahan');
        return false;
    }

    if (transactionId) {
        const transaction = heldTransactions.find(t => t.id === transactionId);
        if (transaction) {
            loadHeldTransaction(transaction);
            return true;
        }
        return false;
    }

    // Show selection dialog
    showTransactionListDialog();
    return false;
}

function showTransactionListDialog() {
    if (typeof Swal === 'undefined') {
        // Fallback to simple list
        const list = heldTransactions.map((t, i) =>
            `${i + 1}. ${new Date(t.date).toLocaleString()} - ${formatCurrency(t.total)} (${t.cart.length} item)`
        ).join('\n');

        const choice = prompt(`Pilih transaksi:\n${list}\n\nMasukkan nomor:`);
        if (choice) {
            const idx = parseInt(choice) - 1;
            if (heldTransactions[idx]) {
                loadHeldTransaction(heldTransactions[idx]);
            }
        }
        return;
    }

    const transactionOptions = heldTransactions.map((t, index) => ({
        id: index,
        text: `${new Date(t.date).toLocaleString()} - ${formatCurrency(t.total)} (${t.cart.length} item)`
    }));

    Swal.fire({
        title: 'Pilih Transaksi',
        input: 'select',
        inputOptions: transactionOptions.reduce((acc, opt) => {
            acc[opt.id] = opt.text;
            return acc;
        }, {}),
        inputPlaceholder: 'Pilih transaksi yang akan dilanjutkan',
        showCancelButton: true,
        confirmButtonText: 'Lanjutkan',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed && result.value !== undefined) {
            const selected = heldTransactions[parseInt(result.value)];
            if (selected) {
                loadHeldTransaction(selected);
            }
        }
    });
}

function loadHeldTransaction(holdData) {
    // Clear current cart
    clearCart();

    // Load held cart
    holdData.cart.forEach(item => {
        POS.cart.push({
            ...item
        });
    });

    // Load discount
    POS.currentDiscount = holdData.discount;
    const discountInput = document.getElementById('discountInput');
    if (discountInput) discountInput.value = holdData.discount;

    // Load customer
    if (holdData.customer) {
        POS.selectedCustomer = holdData.customer;
        const event = new CustomEvent('customerSelected', {
            detail: {
                customer: holdData.customer
            }
        });
        document.dispatchEvent(event);
    }

    // Remove from held list
    heldTransactions = heldTransactions.filter(t => t.id !== holdData.id);
    saveHeldTransactions();

    // Trigger re-render
    const cartEvent = new CustomEvent('cartUpdated');
    document.dispatchEvent(cartEvent);

    showSuccess('Transaksi dimuat kembali');
}

// Lock transaction (prevent modifications)
export function lockTransaction() {
    if (POS.cart.length === 0) {
        showWarning('Tidak ada transaksi aktif');
        return false;
    }

    isTransactionLocked = true;
    POS.transactionLocked = true;
    showSuccess('Transaksi dikunci', 'Locked');

    // Disable interactive elements
    disableCartInteractions(true);
    return true;
}

// Unlock transaction
export function unlockTransaction() {
    isTransactionLocked = false;
    POS.transactionLocked = false;
    showSuccess('Transaksi dibuka kembali', 'Unlocked');

    // Re-enable interactive elements
    disableCartInteractions(false);
    return true;
}

function disableCartInteractions(disable) {
    const inputs = document.querySelectorAll('.price-input, .qty-input, .disc-input, .btn-qty, .btn-remove');
    inputs.forEach(input => {
        if (disable) {
            input.disabled = true;
            input.style.opacity = '0.6';
            input.style.cursor = 'not-allowed';
        } else {
            input.disabled = false;
            input.style.opacity = '';
            input.style.cursor = '';
        }
    });

    const discountGlobal = document.getElementById('discountInput');
    if (discountGlobal) discountGlobal.disabled = disable;
}

// Void entire transaction
export async function voidTransaction() {
    if (POS.cart.length === 0) {
        showWarning('Tidak ada transaksi untuk di-void');
        return false;
    }

    const confirmed = await confirmDialog(
        'Yakin ingin membatalkan seluruh transaksi?',
        'Konfirmasi Void'
    );

    if (confirmed.isConfirmed) {
        const voidData = {
            id: generateVoidId(),
            originalCart: JSON.parse(JSON.stringify(POS.cart)),
            reason: 'Void by cashier',
            timestamp: new Date().toISOString()
        };

        // Save void record
        saveVoidRecord(voidData);

        // Clear cart
        clearCart();
        POS.currentDiscount = 0;

        showSuccess('Transaksi dibatalkan', 'Void');
        return true;
    }
    return false;
}

function generateVoidId() {
    return 'VOID-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function saveVoidRecord(voidData) {
    try {
        const voids = JSON.parse(localStorage.getItem('pos_void_records') || '[]');
        voids.unshift(voidData);
        // Keep only last 50 void records
        if (voids.length > 50) voids.pop();
        localStorage.setItem('pos_void_records', JSON.stringify(voids));
    } catch (error) {
        console.error('Failed to save void record:', error);
    }
}

// Get transaction status
export function getTransactionStatus() {
    return {
        isLocked: isTransactionLocked,
        hasItems: POS.cart.length > 0,
        itemCount: POS.cart.length,
        totalItems: POS.cart.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: POS.getTotal(),
        heldCount: heldTransactions.length
    };
}

// Export for debugging
export function getAllHeldTransactions() {
    return [...heldTransactions];
}

export function deleteHeldTransaction(transactionId) {
    const index = heldTransactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
        heldTransactions.splice(index, 1);
        saveHeldTransactions();
        showSuccess('Transaksi dihapus dari hold list');
        return true;
    }
    return false;
}