// UI/MobileMenu - Mobile-specific menu handling
import { DOM } from '../core/dom.js';

let isMobileMenuOpen = false;

export function initMobileMenu() {
    // Mobile menu button
    const mobileMenuBtn = document.getElementById('mobileMenuNavBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            toggleMobileMenu();
        });
    }
    
    // Close menu when clicking overlay
    if (DOM.slideOverlay) {
        DOM.slideOverlay.addEventListener('click', () => {
            closeMobileMenu();
        });
    }
    
    // Handle orientation change
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768 && isMobileMenuOpen) {
            closeMobileMenu();
        }
    });
}

function toggleMobileMenu() {
    if (isMobileMenuOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    if (DOM.slidePanel) {
        DOM.slidePanel.classList.add('open');
        if (DOM.slideOverlay) DOM.slideOverlay.classList.add('active');
        isMobileMenuOpen = true;
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    if (DOM.slidePanel) {
        DOM.slidePanel.classList.remove('open');
        if (DOM.slideOverlay) DOM.slideOverlay.classList.remove('active');
        isMobileMenuOpen = false;
        document.body.style.overflow = '';
    }
}

// Mobile bottom navigation handling
export function initMobileNavigation() {
    const navItems = document.querySelectorAll('.mobile-bottom-nav .nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked
            item.classList.add('active');
        });
    });
    
    // Handle mobile cart button
    const mobileCartBtn = document.getElementById('mobileCartBtn');
    if (mobileCartBtn) {
        mobileCartBtn.addEventListener('click', () => {
            scrollToElement('.mobile-cart-list');
        });
    }
    
    // Handle mobile cash button
    const mobileCashBtn = document.getElementById('mobileCashBtn');
    if (mobileCashBtn) {
        mobileCashBtn.addEventListener('click', () => {
            const cashBtn = document.getElementById('cashPaymentBtn');
            if (cashBtn) cashBtn.click();
        });
    }
    
    // Handle mobile payment button
    const mobilePaymentBtn = document.getElementById('mobilePaymentBtn');
    if (mobilePaymentBtn) {
        mobilePaymentBtn.addEventListener('click', () => {
            const checkoutBtn = document.getElementById('completeOrderBtn');
            if (checkoutBtn) checkoutBtn.click();
        });
    }
}

function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Mobile-specific UI adjustments
export function adjustForMobile() {
    if (window.innerWidth < 768) {
        // Add mobile-specific classes
        document.body.classList.add('mobile-view');
        
        // Adjust cart height for mobile
        const cartScroll = document.querySelector('.pos-cart-scroll');
        if (cartScroll) {
            const windowHeight = window.innerHeight;
            const headerHeight = document.querySelector('.mobile-header')?.offsetHeight || 0;
            const summaryHeight = document.querySelector('.mobile-cart-summary')?.offsetHeight || 0;
            const navHeight = document.querySelector('.mobile-bottom-nav')?.offsetHeight || 0;
            cartScroll.style.maxHeight = `${windowHeight - headerHeight - summaryHeight - navHeight - 20}px`;
        }
    } else {
        document.body.classList.remove('mobile-view');
    }
}

// Listen to orientation changes
window.addEventListener('resize', () => {
    adjustForMobile();
});

// Export for use
export function isMobile() {
    return window.innerWidth < 768;
}