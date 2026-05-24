// Core/DOM - Central DOM references
export const DOM = {
    // Cart elements
    cartItems: document.getElementById('cartItems'),
    cartItemCount: document.getElementById('cartItemCount'),
    subtotal: document.getElementById('subtotal'),
    taxAmount: document.getElementById('taxAmount'),
    total: document.getElementById('total'),
    discountInput: document.getElementById('discountInput'),

    // Search elements
    searchProduct: document.getElementById('searchProduct'),
    mobileSearchProduct: document.getElementById('mobileSearchProduct'),
    searchDropdown: document.getElementById('searchDropdown'),
    searchResultsList: document.getElementById('searchResultsList'),

    // Customer elements
    customerSelectorCard: document.getElementById('customerSelectorCard'),
    customerSearchInput: document.getElementById('customerSearchInput'),
    customerDropdown: document.getElementById('customerDropdown'),
    customerResultsList: document.getElementById('customerResultsList'),
    selectedCustomerName: document.getElementById('selectedCustomerName'),
    selectedCustomerPhone: document.getElementById('selectedCustomerPhone'),
    customerBadge: document.getElementById('customerBadge'),
    clearCustomerBtn: document.getElementById('clearCustomerBtn'),
    customerId: document.getElementById('customerId'),

    // Mobile elements
    mobileCartItems: document.getElementById('mobileCartItems'),
    mobileTotal: document.getElementById('mobileTotal'),
    mobileCartCount: document.getElementById('mobileCartCount'),

    // UI elements
    currentTime: document.getElementById('currentTime'),
    slidePanel: document.getElementById('slidePanel'),
    slideOverlay: document.getElementById('slideOverlay'),

    // Buttons
    completeOrderBtn: document.getElementById('completeOrderBtn'),
    cashPaymentBtn: document.getElementById('cashPaymentBtn'),
    cardPaymentBtn: document.getElementById('cardPaymentBtn'),
    qrisPaymentBtn: document.getElementById('qrisPaymentBtn'),
    transferPaymentBtn: document.getElementById('transferPaymentBtn'),
    openSlidePanelBtn: document.getElementById('openSlidePanelBtn'),
    closeSlidePanel: document.getElementById('closeSlidePanel'),
    voidTransactionBtn: document.getElementById('voidTransactionBtn'),
    holdTransactionBtn: document.getElementById('holdTransactionBtn'),
    resumeTransactionBtn: document.getElementById('resumeTransactionBtn'),
    discountQuickBtn: document.getElementById('discountQuickBtn')
};