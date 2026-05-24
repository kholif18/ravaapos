// Customer/CustomerSearch
import { DOM } from '../core/dom.js';
import { POS } from '../core/state.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { showSuccess, showWarning, showError } from '../ui/notifications.js';

// Customer data store
let customers = [];
let currentSelectedCustomer = null;

// Sample customer data (nanti diganti dengan API call)
const SAMPLE_CUSTOMERS = [
    { id: 1, name: 'Budi Santoso', phone: '08123456789', email: 'budi@email.com', type: 'member', points: 1500, address: 'Jl. Merdeka No. 1' },
    { id: 2, name: 'Siti Aminah', phone: '08234567890', email: 'siti@email.com', type: 'member', points: 3200, address: 'Jl. Sudirman No. 5' },
    { id: 3, name: 'Ahmad Fauzi', phone: '08345678901', email: 'ahmad@email.com', type: 'regular', points: 0, address: 'Jl. Thamrin No. 10' },
    { id: 4, name: 'Dewi Lestari', phone: '08456789012', email: 'dewi@email.com', type: 'member', points: 500, address: 'Jl. Gatot Subroto No. 8' },
    { id: 5, name: 'Rizky Pratama', phone: '08567890123', email: 'rizky@email.com', type: 'regular', points: 0, address: 'Jl. Diponegoro No. 3' },
    { id: 6, name: 'Maya Sari', phone: '08678901234', email: 'maya@email.com', type: 'member', points: 2100, address: 'Jl. Pahlawan No. 15' },
    { id: 7, name: 'Indra Wijaya', phone: '08789012345', email: 'indra@email.com', type: 'regular', points: 0, address: 'Jl. Veteran No. 7' }
];

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

// Load customers (from API or localStorage)
export async function loadCustomers() {
    try {
        // Try to load from localStorage first
        const savedCustomers = localStorage.getItem('pos_customers');
        if (savedCustomers) {
            customers = JSON.parse(savedCustomers);
        } else {
            // Use sample data
            customers = [...SAMPLE_CUSTOMERS];
            saveCustomersToStorage();
        }
        
        // Optional: Fetch from API
        // const response = await fetch('/api/customers');
        // if (response.ok) {
        //     customers = await response.json();
        //     saveCustomersToStorage();
        // }
        
        return customers;
    } catch (error) {
        console.error('Failed to load customers:', error);
        customers = [...SAMPLE_CUSTOMERS];
        return customers;
    }
}

function saveCustomersToStorage() {
    localStorage.setItem('pos_customers', JSON.stringify(customers));
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
    
    // Close any other open dropdowns
    closeCustomerDropdown();
    
    DOM.customerDropdown.style.display = 'block';
    if (DOM.customerSearchInput) {
        DOM.customerSearchInput.value = '';
        DOM.customerSearchInput.focus();
        searchCustomers('');
    }
}

// Close customer search dropdown
export function closeCustomerDropdown() {
    if (DOM.customerDropdown) {
        DOM.customerDropdown.style.display = 'none';
    }
}

// Search customers based on query
export function searchCustomers(query) {
    if (!DOM.customerResultsList) return;
    
    let filtered = customers;
    if (query && query.trim() !== '') {
        const searchTerm = query.toLowerCase().trim();
        filtered = customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm) ||
            (c.phone && c.phone.includes(searchTerm)) ||
            (c.email && c.email.toLowerCase().includes(searchTerm))
        );
    }
    
    renderCustomerResults(filtered);
}

// Render customer search results
function renderCustomerResults(results) {
    if (!DOM.customerResultsList) return;
    
    if (!results || results.length === 0) {
        DOM.customerResultsList.innerHTML = `
            <div class="customer-dropdown-empty">
                <i class="bx bx-user-x"></i>
                <div>Customer tidak ditemukan</div>
                <small>Tekan Enter untuk tambah customer baru</small>
            </div>
        `;
        return;
    }
    
    DOM.customerResultsList.innerHTML = results.map(customer => `
        <div class="customer-dropdown-item" data-customer-id="${customer.id}">
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
                ${customer.points ? `<div class="customer-dropdown-points"><i class="bx bx-star"></i> ${customer.points} poin</div>` : ''}
            </div>
            <i class="bx bx-chevron-right"></i>
        </div>
    `).join('');
    
    // Add click handlers to results
    DOM.customerResultsList.querySelectorAll('.customer-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(item.dataset.customerId);
            const selected = customers.find(c => c.id === id);
            if (selected) {
                selectCustomer(selected);
            }
        });
    });
}

// Select a customer
export function selectCustomer(customer) {
    if (!customer) return;
    
    renderSelectedCustomer(customer);
    closeCustomerDropdown();
    
    if (customer.type === 'member') {
        showSuccess(`Selamat datang kembali, ${customer.name}!`, 'Member');
        if (customer.points && customer.points > 0) {
            // Optional: show points info
            setTimeout(() => {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'info',
                        title: 'Poin Member',
                        text: `Anda memiliki ${customer.points} poin. ${customer.points >= 100 ? 'Bisa ditukar diskon!' : 'Kumpulkan 100 poin untuk diskon.'}`,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }, 500);
        }
    }
}

// Add new customer
export function addNewCustomer(customerData) {
    const newId = Math.max(...customers.map(c => c.id), 0) + 1;
    const newCustomer = {
        id: newId,
        ...customerData,
        type: customerData.type || 'regular',
        points: customerData.points || 0,
        created_at: new Date().toISOString()
    };
    
    customers.push(newCustomer);
    saveCustomersToStorage();
    
    // Auto-select the new customer
    selectCustomer(newCustomer);
    showSuccess(`Customer ${newCustomer.name} berhasil ditambahkan`);
    
    return newCustomer;
}

// Show add customer modal
function showAddCustomerModal() {
    if (typeof Swal === 'undefined') {
        const name = prompt('Nama customer:');
        if (name) {
            const phone = prompt('Nomor telepon:');
            addNewCustomer({ name, phone, type: 'regular' });
        }
        return;
    }
    
    Swal.fire({
        title: 'Tambah Customer Baru',
        html: `
            <div class="form-group mb-3">
                <input type="text" id="customerName" class="form-control" placeholder="Nama lengkap*" required>
            </div>
            <div class="form-group mb-3">
                <input type="tel" id="customerPhone" class="form-control" placeholder="Nomor telepon">
            </div>
            <div class="form-group mb-3">
                <input type="email" id="customerEmail" class="form-control" placeholder="Email">
            </div>
            <div class="form-group">
                <select id="customerType" class="form-control">
                    <option value="regular">Regular Customer</option>
                    <option value="member">Member</option>
                </select>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            const name = document.getElementById('customerName')?.value;
            if (!name) {
                Swal.showValidationMessage('Nama customer wajib diisi');
                return false;
            }
            return {
                name: name,
                phone: document.getElementById('customerPhone')?.value || '',
                email: document.getElementById('customerEmail')?.value || '',
                type: document.getElementById('customerType')?.value || 'regular'
            };
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            addNewCustomer(result.value);
        }
    });
}

// Initialize customer search module
export function initCustomerSearch() {
    // Load customers
    loadCustomers().then(() => {
        // Initial render
        renderSelectedCustomer(null);
    });
    
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
            if (e.key === 'Escape') {
                closeCustomerDropdown();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const firstItem = document.querySelector('.customer-dropdown-item');
                if (firstItem) {
                    firstItem.click();
                } else {
                    // No results, offer to add new customer
                    const query = DOM.customerSearchInput.value;
                    if (query && query.trim()) {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                title: 'Customer tidak ditemukan',
                                text: `Apakah ingin menambah "${query}" sebagai customer baru?`,
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonText: 'Ya, tambah',
                                cancelButtonText: 'Batal'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    addNewCustomer({ name: query, phone: '', type: 'regular' });
                                }
                            });
                        } else {
                            const add = confirm(`Customer "${query}" tidak ditemukan. Tambahkan?`);
                            if (add) {
                                addNewCustomer({ name: query, phone: '', type: 'regular' });
                            }
                        }
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

export function updateCustomerPoints(customerId, pointsToAdd) {
    const customer = customers.find(c => c.id === customerId);
    if (customer && customer.type === 'member') {
        customer.points = (customer.points || 0) + pointsToAdd;
        saveCustomersToStorage();
        if (currentSelectedCustomer && currentSelectedCustomer.id === customerId) {
            renderSelectedCustomer(customer);
        }
        return true;
    }
    return false;
}