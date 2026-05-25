// Search/SearchDropdown - Reusable dropdown component untuk search
import { escapeHtml } from '../utils/escapeHtml.js';
import { debounce } from '../utils/debounce.js';

class SearchDropdown {
    constructor(options = {}) {
        this.inputElement = options.inputElement;
        this.dropdownElement = options.dropdownElement;
        this.resultsListElement = options.resultsListElement;
        this.onSelect = options.onSelect || (() => {});
        this.onSearch = options.onSearch || (() => []);
        this.renderItem = options.renderItem || null;
        this.placeholder = options.placeholder || 'Cari...';
        this.minChars = options.minChars !== undefined ? options.minChars : 1;
        this.maxResults = options.maxResults || 10;
        this.openDisplay = options.openDisplay || 'block';
        this.isOpen = false;
        this.currentResults = [];     // Simpan hasil pencarian
        this.selectedIndex = -1;       // Track selected index
        
        this.init();
    }
    
    init() {
        if (!this.inputElement) return;
        
        // Set placeholder
        this.inputElement.placeholder = this.placeholder;
        
        // Bind dengan method yang sudah di-binding ke instance
        this.handleInputDebounced = debounce(this.handleInput.bind(this), 300);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleResultsClick = this.handleResultsClick.bind(this);
        
        // Bind events
        this.inputElement.addEventListener('input', this.handleInputDebounced);
        this.inputElement.addEventListener('focus', this.handleFocus);
        this.inputElement.addEventListener('keydown', this.handleKeydown);
        this.resultsListElement?.addEventListener('mousedown', this.handleResultsClick);
        
        // Close on outside click
        document.addEventListener('click', this.handleDocumentClick);
    }
    
    handleFocus() {
        if (this.inputElement.value.length >= this.minChars) {
            this.open();
        }
    }
    
    handleDocumentClick(e) {
        // Perbaiki kondisi close - cek apakah klik di luar komponen
        const isClickInside = 
            this.dropdownElement?.contains(e.target) ||
            this.inputElement === e.target ||
            this.inputElement?.contains(e.target);
        
        if (!isClickInside) {
            this.close();
        }
    }
    
    async handleInput(e) {
        const query = this.inputElement.value.trim();
        
        if (query.length < this.minChars) {
            this.close();
            return;
        }
        
        // Simpan hasil pencarian
        this.currentResults = await this.onSearch(query);
        const limitedResults = this.currentResults.slice(0, this.maxResults);
        
        this.renderResults(limitedResults);
        
        if (limitedResults.length > 0) {
            this.selectedIndex = -1;  // Reset selected index
            this.open();
        } else {
            this.renderEmpty();
            this.open();
        }
    }
    
    renderResults(results) {
        if (!this.resultsListElement) return;
        
        if (!results || results.length === 0) {
            this.renderEmpty();
            return;
        }
        
        // Simpan current results untuk referensi
        this.currentResults = results;
        
        if (this.renderItem) {
            this.resultsListElement.innerHTML = results.map((item, index) => this.renderItem(item, index)).join('');
        } else {
            this.resultsListElement.innerHTML = results.map((item, index) => `
                <div class="search-dropdown-item" data-index="${index}" data-value="${escapeHtml(item.value || item.id)}">
                    <div class="search-dropdown-info">
                        <div class="search-dropdown-name">${escapeHtml(item.label || item.name)}</div>
                        ${item.subtitle ? `<div class="search-dropdown-subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
                    </div>
                    ${item.icon ? `<i class="bx ${item.icon}"></i>` : ''}
                </div>
            `).join('');
        }
        
    }
    
    handleResultsClick(e) {
        const itemEl = e.target.closest('.search-dropdown-item');
        if (!itemEl || !this.resultsListElement?.contains(itemEl)) return;

        e.preventDefault();
        e.stopPropagation();
        
        const index = parseInt(itemEl.dataset.index);
        const selectedItem = this.currentResults[index];
        
        if (selectedItem) {
            this.selectItem(selectedItem);
        }
    }
    
    renderEmpty() {
        if (!this.resultsListElement) return;
        this.resultsListElement.innerHTML = `
            <div class="search-dropdown-empty">
                <i class="bx bx-search-alt"></i>
                <span>Tidak ada hasil</span>
            </div>
        `;
    }
    
    selectItem(item) {
        // Set value ke input
        const displayValue = item.label || item.name;
        if (this.inputElement) {
            this.inputElement.value = displayValue;
        }
        
        // Panggil callback onSelect
        this.onSelect(item);
        
        // Tutup dropdown setelah select
        this.close();
    }
    
    handleKeydown(e) {
        const items = this.resultsListElement?.querySelectorAll('.search-dropdown-item');
        
        // Jika dropdown tidak terbuka atau tidak ada item, abaikan
        if (!this.isOpen || !items || items.length === 0) {
            // Tapi tetap handle Escape untuk close
            if (e.key === 'Escape') {
                this.close();
                e.preventDefault();
            }
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                this.selectedIndex = (this.selectedIndex + 1) % items.length;
                this.updateSelectedItem(items);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
                this.updateSelectedItem(items);
                break;
                
            case 'Enter':
                e.preventDefault();
                e.stopPropagation();
                if (this.selectedIndex >= 0 && this.currentResults[this.selectedIndex]) {
                    this.selectItem(this.currentResults[this.selectedIndex]);
                } else if (items.length > 0) {
                    // Jika tidak ada yang selected, pilih item pertama
                    const firstItem = this.currentResults[0];
                    if (firstItem) {
                        this.selectItem(firstItem);
                    }
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
                
            case 'Tab':
                this.close();
                break;
        }
    }
    
    updateSelectedItem(items) {
        // Reset semua selected class
        items.forEach(el => el.classList.remove('selected'));
        
        // Set selected class pada index yang baru
        if (this.selectedIndex >= 0 && this.selectedIndex < items.length) {
            items[this.selectedIndex].classList.add('selected');
            items[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }
    
    open() {
        if (this.dropdownElement && !this.isOpen) {
            this.dropdownElement.style.display = this.openDisplay;
            this.isOpen = true;
            this.selectedIndex = -1;  // Reset selected index saat buka
            
            // Optional: scroll ke hasil pertama
            const firstItem = this.resultsListElement?.querySelector('.search-dropdown-item');
            if (firstItem) {
                firstItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }
    
    close() {
        if (this.dropdownElement && this.isOpen) {
            this.dropdownElement.style.display = 'none';
            this.isOpen = false;
            this.selectedIndex = -1;
        }
    }
    
    destroy() {
        this.close();
        
        // Remove event listeners
        if (this.inputElement) {
            this.inputElement.removeEventListener('input', this.handleInputDebounced);
            this.inputElement.removeEventListener('focus', this.handleFocus);
            this.inputElement.removeEventListener('keydown', this.handleKeydown);
        }
        
        document.removeEventListener('click', this.handleDocumentClick);
        
        this.resultsListElement?.removeEventListener('mousedown', this.handleResultsClick);
    }
    
    // Method untuk refresh dropdown (misal setelah data berubah)
    refresh() {
        if (this.inputElement && this.inputElement.value.length >= this.minChars) {
            this.handleInput(this.inputElement.value);
        }
    }
    
    // Method untuk set results manual
    setResults(results) {
        this.currentResults = results;
        this.renderResults(results);
        if (results.length > 0) {
            this.open();
        } else {
            this.renderEmpty();
            this.open();
        }
    }

    // Method untuk clear input dan close
    clearAndClose() {
        if (this.inputElement) {
            this.inputElement.value = '';
        }
        this.close();
    }

    // Method untuk set value tanpa trigger search
    setValue(value, triggerSelect = false) {
        if (this.inputElement) {
            this.inputElement.value = value;
            if (triggerSelect && value) {
                // Cari item yang match dengan value
                const matchedItem = this.currentResults.find(item =>
                    item.label === value || item.name === value
                );
                if (matchedItem) {
                    this.selectItem(matchedItem);
                }
            }
        }
    }
}

// Factory function untuk membuat search dropdown
export function createSearchDropdown(options) {
    return new SearchDropdown(options);
}

export default SearchDropdown;
