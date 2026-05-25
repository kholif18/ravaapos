// Transaction/DraftTransaction - Save and load draft transactions
import {
    POS
} from '../core/state.js';
import {
    clearCart
} from '../cart/cartManager.js';
import {
    showSuccess,
    showWarning,
    confirmDialog
} from '../ui/notifications.js';
import {
    formatCurrency,
    formatDate
} from '../utils/formatter.js';

// Draft storage key
const DRAFT_STORAGE_KEY = 'pos_draft_transactions';
const AUTO_SAVE_KEY = 'pos_auto_save_draft';

let autoSaveEnabled = true;
let autoSaveInterval = null;
const AUTO_SAVE_INTERVAL_MS = 30000; // 30 seconds

// Load all drafts
export function loadDrafts() {
    try {
        const drafts = localStorage.getItem(DRAFT_STORAGE_KEY);
        return drafts ? JSON.parse(drafts) : [];
    } catch (error) {
        console.error('Failed to load drafts:', error);
        return [];
    }
}

// Save current cart as draft
export function saveAsDraft(draftName = null) {
    if (POS.cart.length === 0) {
        showWarning('Keranjang kosong, tidak bisa disimpan sebagai draft');
        return null;
    }

    const drafts = loadDrafts();

    const draft = {
        id: Date.now(),
        name: draftName || `Draft ${formatDate(new Date(), 'datetime')}`,
        date: new Date().toISOString(),
        cart: JSON.parse(JSON.stringify(POS.cart)),
        discount: POS.currentDiscount,
        customer: POS.selectedCustomer ? JSON.parse(JSON.stringify(POS.selectedCustomer)) : null,
        subtotal: POS.getSubtotal(),
        total: POS.getTotal(),
        notes: ''
    };

    drafts.push(draft);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));

    showSuccess(`Draft "${draft.name}" disimpan`);
    return draft;
}

// Load a draft
export function loadDraft(draftId) {
    const drafts = loadDrafts();
    const draft = drafts.find(d => d.id === draftId);

    if (!draft) {
        showWarning('Draft tidak ditemukan');
        return false;
    }

    // Confirm if current cart has items
    if (POS.cart.length > 0) {
        confirmDialog('Keranjang saat ini memiliki item. Lanjutkan akan menggantinya?', 'Konfirmasi')
            .then((result) => {
                if (result.isConfirmed) {
                    applyDraft(draft);
                }
            });
        return false;
    }

    applyDraft(draft);
    return true;
}

function applyDraft(draft) {
    // Clear current cart
    clearCart();

    // Load draft cart
    draft.cart.forEach(item => {
        POS.cart.push({
            ...item
        });
    });

    // Load discount
    POS.currentDiscount = draft.discount;
    const discountInput = document.getElementById('discountInput');
    if (discountInput) discountInput.value = draft.discount;

    // Load customer
    if (draft.customer) {
        POS.selectedCustomer = draft.customer;
        const event = new CustomEvent('customerSelected', {
            detail: {
                customer: draft.customer
            }
        });
        document.dispatchEvent(event);
    }

    // Trigger re-render
    const cartEvent = new CustomEvent('cartUpdated');
    document.dispatchEvent(cartEvent);

    showSuccess(`Draft "${draft.name}" dimuat`);
}

// Delete a draft
export function deleteDraft(draftId) {
    const drafts = loadDrafts();
    const filtered = drafts.filter(d => d.id !== draftId);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(filtered));
    showSuccess('Draft dihapus');
}

// Show draft list dialog
export function showDraftListDialog() {
    const drafts = loadDrafts();

    if (drafts.length === 0) {
        showWarning('Tidak ada draft tersimpan');
        return;
    }

    if (typeof Swal === 'undefined') {
        // Fallback to simple list
        const list = drafts.map((d, i) =>
            `${i + 1}. ${d.name} - ${formatCurrency(d.total)} (${d.cart.length} item)`
        ).join('\n');

        const choice = prompt(`Pilih draft:\n${list}\n\nMasukkan nomor:`);
        if (choice) {
            const idx = parseInt(choice) - 1;
            if (drafts[idx]) {
                loadDraft(drafts[idx].id);
            }
        }
        return;
    }

    const draftOptions = drafts.map((draft, index) => ({
        id: draft.id,
        text: `${draft.name} - ${formatCurrency(draft.total)} (${draft.cart.length} item)`
    }));

    Swal.fire({
        title: 'Draft Transaksi',
        input: 'select',
        inputOptions: draftOptions.reduce((acc, opt) => {
            acc[opt.id] = opt.text;
            return acc;
        }, {}),
        inputPlaceholder: 'Pilih draft',
        showCancelButton: true,
        confirmButtonText: 'Muat',
        cancelButtonText: 'Batal',
        showDenyButton: true,
        denyButtonText: 'Hapus'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            loadDraft(parseInt(result.value));
        } else if (result.isDenied && result.value) {
            deleteDraft(parseInt(result.value));
            showDraftListDialog(); // Refresh list
        }
    });
}

// Auto-save current cart
export function enableAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);

    autoSaveInterval = setInterval(() => {
        if (autoSaveEnabled && POS.cart.length > 0) {
            autoSaveCurrentCart();
        }
    }, AUTO_SAVE_INTERVAL_MS);

    // Also save on page unload
    window.addEventListener('beforeunload', () => {
        if (POS.cart.length > 0) {
            autoSaveCurrentCart();
        }
    });
}

function autoSaveCurrentCart() {
    const autoSaveData = {
        cart: JSON.parse(JSON.stringify(POS.cart)),
        discount: POS.currentDiscount,
        customer: POS.selectedCustomer ? JSON.parse(JSON.stringify(POS.selectedCustomer)) : null,
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(autoSaveData));
}

// Load auto-saved cart (recovery)
export function loadAutoSave() {
    try {
        const saved = localStorage.getItem(AUTO_SAVE_KEY);
        if (!saved) return false;

        const autoSaveData = JSON.parse(saved);
        const lastUpdated = new Date(autoSaveData.lastUpdated);
        const now = new Date();
        const hoursDiff = (now - lastUpdated) / (1000 * 60 * 60);

        // Only recover if less than 24 hours old
        if (hoursDiff < 24 && autoSaveData.cart && autoSaveData.cart.length > 0) {
            confirmDialog(
                `Ditemukan transaksi yang belum selesai dari ${formatDate(lastUpdated, 'datetime')}. Apakah ingin melanjutkan?`,
                'Pemulihan Transaksi'
            ).then((result) => {
                if (result.isConfirmed) {
                    // Load auto-save data
                    autoSaveData.cart.forEach(item => {
                        POS.cart.push({
                            ...item
                        });
                    });
                    POS.currentDiscount = autoSaveData.discount;
                    if (autoSaveData.customer) {
                        POS.selectedCustomer = autoSaveData.customer;
                    }

                    // Trigger re-render
                    const event = new CustomEvent('cartUpdated');
                    document.dispatchEvent(event);

                    showSuccess('Transaksi dipulihkan');
                } else {
                    // Clear auto-save
                    localStorage.removeItem(AUTO_SAVE_KEY);
                }
            });
            return true;
        }
    } catch (error) {
        console.error('Failed to load auto-save:', error);
    }
    return false;
}

// Clear auto-save after successful transaction
export function clearAutoSave() {
    localStorage.removeItem(AUTO_SAVE_KEY);
}

// Get all drafts with metadata
export function getDraftMetadata() {
    const drafts = loadDrafts();
    return drafts.map(draft => ({
        id: draft.id,
        name: draft.name,
        date: draft.date,
        itemCount: draft.cart.length,
        total: draft.total,
        formattedDate: formatDate(draft.date, 'datetime'),
        formattedTotal: formatCurrency(draft.total)
    }));
}

// Update draft name
export function renameDraft(draftId, newName) {
    const drafts = loadDrafts();
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
        draft.name = newName;
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
        showSuccess('Nama draft diubah');
        return true;
    }
    return false;
}