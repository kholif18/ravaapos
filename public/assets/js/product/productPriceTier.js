// /public/assets/js/product/productPriceTier.js

export function initPriceTier(context = 'create') {
    const btnAdd = document.getElementById(context === 'create' ? 'btnAddTierCreate' : 'btnAddTierEdit');
    const tableBody = document.getElementById(context === 'create' ? 'tierTableBodyCreate' : 'tierTableBodyEdit');

    if (!btnAdd || !tableBody) return;

    // Remove existing listeners to avoid duplicates
    const newBtnAdd = btnAdd.cloneNode(true);
    btnAdd.parentNode.replaceChild(newBtnAdd, btnAdd);

    newBtnAdd.addEventListener('click', () => {
        addTierRow(tableBody);
    });

    tableBody.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-tier')) {
            e.target.closest('tr').remove();
        }
    });
}

export function addTierRow(tableBody, data = null) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>
            <input type="number" name="tierMinQty[]" class="form-control form-control-sm tier-min-qty" 
                value="${data ? data.minQty : ''}" min="2" placeholder="Min Qty" required>
        </td>
        <td>
            <input type="number" step="0.01" name="tierPrice[]" class="form-control form-control-sm tier-price" 
                value="${data ? data.price : ''}" min="0" placeholder="Harga" required>
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-tier">
                <i class="bx bx-trash"></i>
            </button>
        </td>
    `;
    tableBody.appendChild(row);

    // Auto sort validation/behavior could be added here
    const minQtyInput = row.querySelector('.tier-min-qty');
    const priceInput = row.querySelector('.tier-price');

    minQtyInput.addEventListener('change', () => {
        if (parseInt(minQtyInput.value) <= 1) {
            minQtyInput.value = 2;
        }
        sortTiers(tableBody);
        checkDuplicateQty(tableBody);
    });

    priceInput.addEventListener('change', () => {
        const salePriceId = tableBody.id === 'tierTableBodyCreate' ? 'inputSalePrice' : 'editInputSalePrice';
        const salePrice = parseFloat(document.getElementById(salePriceId)?.value || 0);
        if (salePrice > 0 && parseFloat(priceInput.value) > salePrice) {
            alert('Harga bertingkat tidak boleh melebihi harga normal');
            priceInput.value = salePrice;
        }
    });
}

function sortTiers(tableBody) {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    rows.sort((a, b) => {
        const qtyA = parseInt(a.querySelector('.tier-min-qty').value) || 0;
        const qtyB = parseInt(b.querySelector('.tier-min-qty').value) || 0;
        return qtyA - qtyB;
    });
    rows.forEach(row => tableBody.appendChild(row));
}

function checkDuplicateQty(tableBody) {
    const qtys = new Set();
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const input = row.querySelector('.tier-min-qty');
        const qty = parseInt(input.value);
        if (qtys.has(qty)) {
            input.classList.add('is-invalid');
            // Option: auto increment or just show error
        } else {
            input.classList.remove('is-invalid');
            qtys.add(qty);
        }
    });
}

export function clearTiers(context = 'create') {
    const tableBody = document.getElementById(context === 'create' ? 'tierTableBodyCreate' : 'tierTableBodyEdit');
    if (tableBody) tableBody.innerHTML = '';
}

export function loadTiers(tiers, context = 'edit') {
    const tableBody = document.getElementById(context === 'create' ? 'tierTableBodyCreate' : 'tierTableBodyEdit');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (tiers && Array.isArray(tiers)) {
        // Sort tiers by minQty ascending for UI
        const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
        sortedTiers.forEach(tier => {
            addTierRow(tableBody, tier);
        });
    }
}
