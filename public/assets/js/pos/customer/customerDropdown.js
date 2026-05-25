// Customer/CustomerDropdown - Dropdown component khusus customer
import { DOM } from '../core/dom.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { debounce } from '../utils/debounce.js';

class CustomerDropdown {
    constructor(options = {}) {
        this.triggerElement = options.triggerElement;
        this.dropdownElement = options.dropdownElement;
        this.searchInput = options.searchInput;
        this.resultsList = options.resultsList;
        this.onSelect = options.onSelect || (() => {});
        this.onSearch = options.onSearch || (() => []);
        this.onAddNew = options.onAddNew || (() => {});
        
        this.isOpen = false;
        this.currentResults = [];
        this.selectedIndex = -1;
        
        this.init();
    }
    
    init() {
        if (this.triggerElement) {
            this.triggerElement.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-clear-customer')) {
                    this.toggle();
                }
            });
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('input', debounce((e) => {
                this.search(e.target.value);
            }, 300));
            
            this.searchInput.addEventListener('keydown', (e) => {
                this.handleKeydown(e);
            });
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.dropdownElement && !this.dropdownElement.contains(e.target) &&
                this.triggerElement && !this.triggerElement.contains(e.target)) {
                this.close();
            }
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.dropdownElement) {
            this.dropdownElement.style.display = 'block';
            this.isOpen = true;
            this.searchInput?.focus();
            this.search('');
        }
    }
    
    close() {
        if (this.dropdownElement) {
            this.dropdownElement.style.display = 'none';
            this.isOpen = false;
            this.selectedIndex = -1;
        }
    }
    
    async search(query) {
        const results = await this.onSearch(query);
        this.currentResults = results;
        this.renderResults(results);
    }
    
    renderResults(results) {
        if (!this.resultsList) return;
        
        if (!results || results.length === 0) {
            this.resultsList.innerHTML = `
                <div class="customer-dropdown-empty">
                    <i class="bx bx-user-x"></i>
                    <div>Customer tidak ditemukan</div>
                    <button class="btn btn-sm btn-outline-primary mt-2" id="addNewCustomerBtn">
                        <i class="bx bx-plus"></i> Tambah Customer
                    </button>
                </div>
            `;
            
            const addBtn = this.resultsList.querySelector('#addNewCustomerBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    this.onAddNew();
                    this.close();
                });
            }
            return;
        }
        
        this.resultsList.innerHTML = results.map((customer, index) => `
            <div class="customer-dropdown-item" data-index="${index}" data-customer-id="${customer.id}">
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
        
        // Add click handlers
        this.resultsList.querySelectorAll('.customer-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const selected = this.currentResults[index];
                if (selected) {
                    this.selectCustomer(selected);
                }
            });
        });
    }
    
    selectCustomer(customer) {
        this.onSelect(customer);
        this.close();
    }
    
    handleKeydown(e) {
        const items = this.resultsList?.querySelectorAll('.customer-dropdown-item');
        if (!items || items.length === 0) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                this.updateSelected(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.updateSelected(items);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && this.currentResults[this.selectedIndex]) {
                    this.selectCustomer(this.currentResults[this.selectedIndex]);
                }
                break;
        }
    }
    
    updateSelected(items) {
        items.forEach((item, idx) => {
            if (idx === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
}

export function initCustomerDropdown() {
    const dropdown = new CustomerDropdown({
        triggerElement: DOM.customerSelectorCard,
        dropdownElement: DOM.customerDropdown,
        searchInput: DOM.customerSearchInput,
        resultsList: DOM.customerResultsList,
        onSelect: (customer) => {
            const event = new CustomEvent('customerSelected', { detail: { customer } });
            document.dispatchEvent(event);
        },
        onAddNew: () => {
            const event = new CustomEvent('openAddCustomerModal');
            document.dispatchEvent(event);
        },
        onSearch: async (query) => {
            // This will be connected to customerSearch module
            const event = new CustomEvent('searchCustomers', { detail: { query, callback: (results) => {
                // Callback handled elsewhere
            }}});
            document.dispatchEvent(event);
            return [];
        }
    });
    
    return dropdown;
}

export default CustomerDropdown;