// Customer/CustomerSearch
import { DOM } from '../core/dom.js';
import { POS } from '../core/state.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { showSuccess, showWarning, showError } from '../ui/notifications.js';

// Customer data store
let customers = [];
let currentSelectedCustomer = null;
let selectedIndex = -1;

// Debounce helper function
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

// Load customers (from API)
export async function loadCustomers() {
    try {
        const response = await fetch('/pos/customers');
        if (response.ok) {
            const data = await response.json();
            customers = data.customers || [];
            return customers;
        }
        return [];
    } catch (error) {
        console.error('Failed to load customers:', error);
        return [];
    }
}

// Render selected customer in the UI
export function renderSelectedCustomer(customer = null) {
    const nameEl = DOM.selectedCustomerName;
    const phoneEl = DOM.selectedCustomerPhone;
    const badgeEl = DOM.customerBadge;
    const clearBtn = DOM.clearCustomerBtn;
    const customerIdInput = DOM.customerId;
    
    if (!nameEl) return;
    
    if (!customer) {
        // Walk-in Customer state
        nameEl.textContent = 'Walk-in Customer';
        if (phoneEl) {
            phoneEl.innerHTML = '<i class="bx bx-phone"></i><span>Customer umum / non member</span>';
        }
        if (badgeEl) {
            badgeEl.textContent = 'UMUM';
            badgeEl.classList.remove('member-badge');
        }
        if (clearBtn) clearBtn.style.display = 'none';
        if (customerIdInput) customerIdInput.value = '';
        currentSelectedCustomer = null;
        POS.selectedCustomer = null;
        return;
    }
    
    // Selected customer state
    nameEl.textContent = customer.name;
    if (phoneEl) {
        phoneEl.innerHTML = `<i class="bx bx-phone"></i><span>${customer.phone || '-'}</span>`;
    }
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
    currentSelectedCustomer = customer;
    POS.selectedCustomer = customer;
    
    // Dispatch event for other modules
    const event = new CustomEvent('customerSelected', { detail: { customer } });
    document.dispatchEvent(event);
}

// Clear selected customer (back to walk-in)
export function clearSelectedCustomer() {
    renderSelectedCustomer(null);
    showSuccess('Customer direset ke Walk-in Customer');
    closeCustomerDropdown();
}

// Open customer search dropdown
export function openCustomerDropdown() {
    if (!DOM.customerDropdown) return;
    
    DOM.customerDropdown.style.display = 'block';
    if (DOM.customerSearchInput) {
        DOM.customerSearchInput.value = '';
        DOM.customerSearchInput.focus();
        // Load initial customers when opening
        loadCustomers().then(results => {
            renderCustomerResults(results.slice(0, 10));
        });
    }
}

// Close customer search dropdown
export function closeCustomerDropdown() {
    if (DOM.customerDropdown) {
        DOM.customerDropdown.style.display = 'none';
    }
}

// Search customers based on query
export async function searchCustomers(query) {
    if (!DOM.customerResultsList) return;
    
    if (!query || query.trim() === '') {
        const initial = await loadCustomers();
        renderCustomerResults(initial.slice(0, 10));
        return;
    }

    try {
        const response = await fetch(`/pos/search-customers?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.customers) {
            customers = data.customers;
            renderCustomerResults(customers);
        }
    } catch (error) {
        console.error('Customer search error:', error);
    }
}

// Render customer search results
function renderCustomerResults(results) {
    if (!DOM.customerResultsList) return;
    
    selectedIndex = -1;
    
    if (!results || results.length === 0) {
        DOM.customerResultsList.innerHTML = `
            <div class="customer-dropdown-empty">
                <i class="bx bx-user-x"></i>
                <div>Customer tidak ditemukan</div>
            </div>
        `;
        return;
    }
    
    DOM.customerResultsList.innerHTML = results.map((customer, index) => `
        <div class="customer-dropdown-item" data-customer-id="${customer.id}" data-index="${index}">
            <div class="customer-dropdown-info">
                <div class="customer-dropdown-name">
                    ${escapeHtml(customer.name)}
                    <span class="customer-dropdown-badge ${customer.type === 'member' ? 'member-badge' : ''}">
                        ${customer.type === 'member' ? 'MEMBER' : 'REGULAR'}
                    </span>
                </div>
                <div class="customer-dropdown-phone">
                    <i class="bx bx-phone"></i> ${customer.phone || '-'}
                </div>
            </div>
            <i class="bx bx-chevron-right"></i>
        </div>
    `).join('');
    
    // Add click handlers to results
    DOM.customerResultsList.querySelectorAll('.customer-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(item.dataset.customerId);
            const selected = results.find(c => c.id === id);
            if (selected) {
                selectCustomer(selected);
            }
        });
    });
}

function updateSelectedHighlight(items) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

// Select a customer
export function selectCustomer(customer) {
    if (!customer) return;
    
    renderSelectedCustomer(customer);
    closeCustomerDropdown();
    
    if (customer.type === 'member') {
        showSuccess(`Selamat datang kembali, ${customer.name}!`, 'Member');
    }
}

// Initialize customer search module
export function initCustomerSearch() {
    // Initial render
    renderSelectedCustomer(null);
    
    // Customer card click to open dropdown
    if (DOM.customerSelectorCard) {
        DOM.customerSelectorCard.addEventListener('click', (e) => {
            // Don't open dropdown if clicking clear button
            if (e.target.closest('#clearCustomerBtn')) {
                e.stopPropagation();
                return;
            }
            openCustomerDropdown();
        });
    }
    
    // Search input handler
    if (DOM.customerSearchInput) {
        const debouncedSearch = debounce((e) => {
            searchCustomers(e.target.value);
        }, 300);
        
        DOM.customerSearchInput.addEventListener('input', debouncedSearch);
        
        DOM.customerSearchInput.addEventListener('keydown', (e) => {
            const items = DOM.customerResultsList?.querySelectorAll('.customer-dropdown-item');
            
            if (e.key === 'Escape') {
                closeCustomerDropdown();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (items && items.length > 0) {
                    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                    updateSelectedHighlight(items);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (items && items.length > 0) {
                    selectedIndex = Math.max(selectedIndex - 1, 0);
                    updateSelectedHighlight(items);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex >= 0 && items && items[selectedIndex]) {
                    items[selectedIndex].click();
                } else {
                    const firstItem = document.querySelector('.customer-dropdown-item');
                    if (firstItem) {
                        firstItem.click();
                    }
                }
            }
        });
    }
    
    // Clear button handler
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
    
    // Keyboard shortcut F2
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            openCustomerDropdown();
        }
    });
    
    // Listen for customer reset event
    document.addEventListener('resetCustomer', () => {
        clearSelectedCustomer();
    });
    
    console.log('Customer search module initialized');
}

// Export for use in other modules
export function getCurrentCustomer() {
    return currentSelectedCustomer;
}

export function getAllCustomers() {
    return [...customers];
}