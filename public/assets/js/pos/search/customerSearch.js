// Customer/CustomerSearch
import {
    DOM
} from '../core/dom.js';
import {
    POS
} from '../core/state.js';
import {
    escapeHtml
} from '../utils/escapeHtml.js';
import {
    showSuccess
} from '../ui/notifications.js';

// Sample customer data (nanti dari API)
let customers = [];

export function initCustomerSearch() {
    // Load customers from API nanti
    loadSampleCustomers();

    // Event listener untuk card click
    if (DOM.customerSelectorCard) {
        DOM.customerSelectorCard.addEventListener('click', (e) => {
            // Jangan buka dropdown jika klik tombol clear
            if (e.target.closest('#clearCustomerBtn')) {
                e.stopPropagation();
                return;
            }
            openCustomerDropdown();
        });
    }

    // Search input handler
    if (DOM.customerSearchInput) {
        DOM.customerSearchInput.addEventListener('input', debounce((e) => {
            searchCustomers(e.target.value);
        }, 300));

        DOM.customerSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeCustomerDropdown();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const firstItem = document.querySelector('.customer-dropdown-item');
                if (firstItem) firstItem.click();
            }
        });
    }

    // Clear button
    if (DOM.clearCustomerBtn) {
        DOM.clearCustomerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearSelectedCustomer();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (DOM.customerSelectorCard && !DOM.customerSelectorCard.contains(e.target)) {
            closeCustomerDropdown();
        }
    });

    // Listen for F2 shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            openCustomerDropdown();
        }
    });

    // Initial render
    renderSelectedCustomer(null);
}

function loadSampleCustomers() {
    customers = [{
            id: 1,
            name: 'Budi Santoso',
            phone: '08123456789',
            type: 'member',
            points: 1500
        },
        {
            id: 2,
            name: 'Siti Aminah',
            phone: '08234567890',
            type: 'member',
            points: 3200
        },
        {
            id: 3,
            name: 'Ahmad Fauzi',
            phone: '08345678901',
            type: 'regular',
            points: 0
        },
        {
            id: 4,
            name: 'Dewi Lestari',
            phone: '08456789012',
            type: 'member',
            points: 500
        },
        {
            id: 5,
            name: 'Rizky Pratama',
            phone: '08567890123',
            type: 'regular',
            points: 0
        }
    ];
}

function openCustomerDropdown() {
    if (!DOM.customerDropdown) return;

    DOM.customerDropdown.style.display = 'block';
    if (DOM.customerSearchInput) {
        DOM.customerSearchInput.value = '';
        DOM.customerSearchInput.focus();
        searchCustomers('');
    }
}

function closeCustomerDropdown() {
    if (DOM.customerDropdown) {
        DOM.customerDropdown.style.display = 'none';
    }
}

function searchCustomers(query) {
    if (!DOM.customerResultsList) return;

    let filtered = customers;
    if (query && query.trim() !== '') {
        filtered = customers.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query)
        );
    }

    if (filtered.length === 0) {
        DOM.customerResultsList.innerHTML = `
            <div class="customer-dropdown-empty">
                <i class="bx bx-user-x"></i>
                <div>Customer tidak ditemukan</div>
                <small>Tekan Esc untuk tutup</small>
            </div>
        `;
        return;
    }

    DOM.customerResultsList.innerHTML = filtered.map(customer => `
        <div class="customer-dropdown-item" data-customer-id="${customer.id}">
            <div class="customer-dropdown-info">
                <div class="customer-dropdown-name">
                    ${escapeHtml(customer.name)}
                    <span class="customer-dropdown-badge">${customer.type === 'member' ? 'MEMBER' : 'REGULAR'}</span>
                </div>
                <div class="customer-dropdown-phone">
                    <i class="bx bx-phone"></i> ${customer.phone || '-'}
                </div>
            </div>
            <i class="bx bx-chevron-right"></i>
        </div>
    `).join('');

    // Add click handlers
    DOM.customerResultsList.querySelectorAll('.customer-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.customerId);
            const selected = customers.find(c => c.id === id);
            if (selected) selectCustomer(selected);
        });
    });
}

function selectCustomer(customer) {
    renderSelectedCustomer(customer);
    closeCustomerDropdown();
    if (customer && customer.type === 'member') {
        showSuccess(`Selamat datang kembali, ${customer.name}!`, 'Member');
    }
}

function renderSelectedCustomer(customer) {
    const nameEl = DOM.selectedCustomerName;
    const phoneEl = DOM.selectedCustomerPhone;
    const badgeEl = DOM.customerBadge;
    const clearBtn = DOM.clearCustomerBtn;
    const customerIdInput = DOM.customerId;

    if (!nameEl) return;

    if (!customer) {
        // Walk-in Customer
        nameEl.textContent = 'Walk-in Customer';
        if (phoneEl) phoneEl.innerHTML = '<i class="bx bx-phone"></i><span>Customer umum / non member</span>';
        if (badgeEl) {
            badgeEl.textContent = 'UMUM';
            badgeEl.classList.remove('member-badge');
        }
        if (clearBtn) clearBtn.style.display = 'none';
        if (customerIdInput) customerIdInput.value = '';
        POS.selectedCustomer = null;
        return;
    }

    // Selected customer
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
    if (customerIdInput) customerIdInput.value = customer.id;
    POS.selectedCustomer = customer;
}

function clearSelectedCustomer() {
    renderSelectedCustomer(null);
    showSuccess('Customer direset ke Walk-in');
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}