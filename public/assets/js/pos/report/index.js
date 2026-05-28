// Reports/index.js - Entry point for POS reports
import { DOM } from '../core/dom.js';
import { showDailyReportModal } from './dailyReport.js';
import { showXReadingModal } from './xReading.js';
import { showZReadingModal } from './zReading.js';
import { showWarning } from '../ui/notifications.js';
import { clearCart } from '../cart/cartManager.js';
import { POS } from '../core/state.js';

export function initReportHandlers() {
    // Daily Report
    if (DOM.dailyReportBtnSlide) {
        DOM.dailyReportBtnSlide.addEventListener('click', () => {
            closeSlidePanel();
            showDailyReportModal();
        });
    }

    // X-Reading
    if (DOM.xReadingBtnSlide) {
        DOM.xReadingBtnSlide.addEventListener('click', () => {
            closeSlidePanel();
            showXReadingModal();
        });
    }

    // Z-Reading
    if (DOM.zReadingBtnSlide) {
        DOM.zReadingBtnSlide.addEventListener('click', () => {
            closeSlidePanel();
            showZReadingModal();
        });
    }

    // Best Seller
    if (DOM.bestSellerBtnSlide) {
        DOM.bestSellerBtnSlide.addEventListener('click', () => {
            closeSlidePanel();
            showWarning('Feature Best Seller dalam pengembangan');
        });
    }

    // Stock Report
    if (DOM.stockReportBtnSlide) {
        DOM.stockReportBtnSlide.addEventListener('click', () => {
            closeSlidePanel();
            window.location.href = '/stock';
        });
    }
}

export function initSlideMenuHandlers() {
    // Saved Transactions
    if (DOM.savedTransactionBtn) {
        DOM.savedTransactionBtn.addEventListener('click', () => {
            closeSlidePanel();
            const resumeBtn = document.getElementById('resumeTransactionBtn');
            if (resumeBtn) resumeBtn.click();
        });
    }

    // Reprint Receipt
    if (DOM.reprintReceiptBtn) {
        DOM.reprintReceiptBtn.addEventListener('click', () => {
            closeSlidePanel();
            showWarning('Feature Reprint dalam pengembangan');
        });
    }

    // Clear Cart
    if (DOM.clearCartBtnSlide) {
        DOM.clearCartBtnSlide.addEventListener('click', () => {
            if (POS.cart.length === 0) {
                showWarning('Keranjang sudah kosong');
                return;
            }
            closeSlidePanel();
            Swal.fire({
                title: 'Kosongkan Keranjang?',
                text: "Semua item di keranjang akan dihapus!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, Kosongkan!',
                cancelButtonText: 'Batal'
            }).then((result) => {
                if (result.isConfirmed) {
                    clearCart();
                }
            });
        });
    }

    // Settings
    if (DOM.printerSettingsBtn) {
        DOM.printerSettingsBtn.addEventListener('click', () => {
            closeSlidePanel();
            showWarning('Printer Settings dalam pengembangan');
        });
    }

    if (DOM.shiftSettingsBtn) {
        DOM.shiftSettingsBtn.addEventListener('click', () => {
            closeSlidePanel();
            showWarning('Shift Settings dalam pengembangan');
        });
    }

    if (DOM.userSettingsBtn) {
        DOM.userSettingsBtn.addEventListener('click', () => {
            closeSlidePanel();
            window.location.href = '/users';
        });
    }
}

function closeSlidePanel() {
    if (DOM.slidePanel) DOM.slidePanel.classList.remove('open');
    if (DOM.slideOverlay) DOM.slideOverlay.classList.remove('active');
}
