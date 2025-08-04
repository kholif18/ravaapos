// barcode.js - Refactored untuk mendukung barcode.ejs + pengaturan ukuran kertas & pagination

const allProducts = window.allProducts || [];
const productSelect = $('#productSelect2');

// Format ke Select2
const select2Data = allProducts.map(p => ({
    id: p.id,
    text: `${p.name} (${p.code})`,
    ...p
}));

productSelect.select2({
    data: select2Data,
    placeholder: 'Ketik nama/kode/barcode produk...',
    width: '100%',
    dropdownParent: productSelect.parent(),
    templateResult: data => {
        if (!data.id) return data.text;
        return $(
            `<div>
        <strong>${data.name}</strong><br/>
        <small class="text-muted">
          ${data.code} - ${data.barcode || '—'} - Rp ${parseFloat(data.salePrice || 0).toLocaleString('id-ID')}
        </small>
      </div>`
        );
    },
    templateSelection: data => data.name || data.text
});

function getSelectedProducts() {
    const selectedIds = productSelect.val();
    return allProducts.filter(p => selectedIds.includes(p.id.toString()));
}

document.getElementById('paperSize').addEventListener('change', function () {
    const customPanel = document.getElementById('customPaperSize');
    customPanel.classList.toggle('d-none', this.value !== 'Custom');
});

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('btnGenerateBarcodePreview');
    const container = document.getElementById('barcodeLabels');
    const previewArea = document.getElementById('barcodePreviewArea');

    generateBtn.addEventListener('click', () => {
        const selectedProducts = getSelectedProducts();
        const copies = parseInt(document.getElementById('copiesPerProduct').value);
        const showName = document.getElementById('optName').checked;
        const showPrice = document.getElementById('optPrice').checked;
        const showCode = document.getElementById('optCode').checked;
        const showTax = document.getElementById('optTax').checked;
        const border = document.getElementById('optBorder').checked;
        const barcodeHeight = parseInt(document.getElementById('barcodeHeight').value);
        const nameFontSize = parseInt(document.getElementById('nameFontSize').value);
        const priceFontSize = parseInt(document.getElementById('priceFontSize').value);
        const barcodeType = document.getElementById('barcodeType').value;

        const labelWidth = parseFloat(document.getElementById('labelWidth').value);
        const labelHeight = parseFloat(document.getElementById('labelHeight').value);
        const columns = parseInt(document.getElementById('columns').value);
        const marginTop = parseFloat(document.getElementById('marginTop').value);
        const marginLeft = parseFloat(document.getElementById('marginLeft').value);
        const marginBottom = parseFloat(document.getElementById('marginBottom')?.value || 0);
        const marginRight = parseFloat(document.getElementById('marginRight')?.value || 0);
        const rowSpacing = parseFloat(document.getElementById('rowSpacing').value);
        const colSpacing = parseFloat(document.getElementById('colSpacing').value);

        const paperSize = document.getElementById('paperSize').value;
        let paperHeight = 297,
            paperWidth = 210; // Default A4
        if (paperSize === 'Letter') {
            paperWidth = 216;
            paperHeight = 279;
        } else if (paperSize === 'Custom') {
            paperWidth = parseFloat(document.getElementById('paperWidth').value);
            paperHeight = parseFloat(document.getElementById('paperHeight').value);
        }

        container.innerHTML = '';

        const labels = [];
        selectedProducts.forEach(p => {
            const barcode = p.barcode || p.code;
            if (!barcode || barcode.length < 3) return;

            for (let i = 0; i < copies; i++) {
                const label = document.createElement('div');
                label.className = 'label p-2';
                label.style.width = `${labelWidth}mm`;
                label.style.height = `${labelHeight}mm`;
                label.style.boxSizing = 'border-box';
                label.style.display = 'flex';
                label.style.flexDirection = 'column';
                label.style.alignItems = 'center';
                label.style.justifyContent = 'flex-start';
                label.style.marginRight = `${colSpacing}mm`;
                label.style.marginBottom = `${rowSpacing}mm`;
                if (border) label.style.border = '1px solid #ccc';

                if (showName) {
                    const nameEl = document.createElement('div');
                    nameEl.style.fontSize = `${nameFontSize}px`;
                    nameEl.textContent = p.name;
                    label.appendChild(nameEl);
                }

                if (showPrice) {
                    const priceEl = document.createElement('div');
                    priceEl.style.fontSize = `${priceFontSize}px`;
                    priceEl.textContent = `Rp ${parseFloat(p.salePrice || 0).toLocaleString('id-ID')}`;
                    label.appendChild(priceEl);
                }

                if (showTax && p.tax) {
                    const taxEl = document.createElement('div');
                    taxEl.style.fontSize = '10px';
                    taxEl.textContent = `Pajak: ${p.tax}%`;
                    label.appendChild(taxEl);
                }

                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('width', '100%');
                label.appendChild(svg);

                JsBarcode(svg, barcode, {
                    format: barcodeType || (barcode.length === 13 ? 'EAN13' : 'CODE128'),
                    width: 2,
                    height: barcodeHeight,
                    displayValue: showCode
                });

                labels.push(label);
            }
        });

        const availableWidth = paperWidth - marginLeft - marginRight;
        const availableHeight = paperHeight - marginTop - marginBottom;

        const maxRows = Math.floor(availableHeight / (labelHeight + rowSpacing));
        const maxCols = Math.min(columns, Math.floor(availableWidth / (labelWidth + colSpacing)));
        const perPage = maxRows * maxCols;
        const pages = Math.ceil(labels.length / perPage);

        container.innerHTML = '';

        let labelIndex = 0;

        for (let p = 0; p < pages; p++) {
            const page = document.createElement('div');
            page.className = 'barcode-page position-relative mb-4';
            page.dataset.page = p + 1;
            page.style.display = p === 0 ? 'block' : 'none';
            page.style.width = `${paperWidth}mm`;
            page.style.height = `${paperHeight}mm`;
            page.style.background = 'white';
            page.style.boxShadow = '0 0 3px rgba(0,0,0,0.1)';
            page.style.boxSizing = 'border-box';
            page.style.position = 'relative';
            page.style.overflow = 'hidden';

            const usableWidth = paperWidth - marginLeft - marginRight;
            const usableHeight = paperHeight - marginTop - marginBottom;

            const maxCols = Math.min(columns, Math.floor((usableWidth + colSpacing) / (labelWidth + colSpacing)));
            const maxRows = Math.floor((usableHeight + rowSpacing) / (labelHeight + rowSpacing));

            const pageTop = marginTop;
            const pageLeft = marginLeft;

            for (let row = 0; row < maxRows; row++) {
                for (let col = 0; col < maxCols; col++) {
                    if (labelIndex >= labels.length) break;

                    const label = labels[labelIndex];
                    label.style.position = 'absolute';
                    const top = pageTop + row * (labelHeight + rowSpacing);
                    const left = pageLeft + col * (labelWidth + colSpacing);

                    label.style.top = `${top}mm`;
                    label.style.left = `${left}mm`;

                    page.appendChild(label);
                    labelIndex++;
                }
            }

            container.appendChild(page);
        }

        // Pagination Control
        let pagination = document.getElementById('paginationControls');
        if (!pagination) {
            pagination = document.createElement('div');
            pagination.id = 'paginationControls';
            pagination.className = 'text-center mt-2';
            previewArea.appendChild(pagination);
        }
        pagination.innerHTML = '';

        if (pages > 1) {
            let currentPage = 1;

            const updatePage = (toPage) => {
                container.querySelectorAll('.barcode-page').forEach(pg => {
                    pg.style.display = pg.dataset.page == toPage ? 'flex' : 'none';
                });
                currentPage = toPage;
                prevBtn.disabled = currentPage === 1;
                nextBtn.disabled = currentPage === pages;
            };

            const prevBtn = document.createElement('button');
            prevBtn.textContent = 'Sebelumnya';
            prevBtn.className = 'btn btn-sm btn-outline-primary me-2';
            prevBtn.disabled = true;
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) updatePage(--currentPage);
            });

            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Berikutnya';
            nextBtn.className = 'btn btn-sm btn-outline-primary';
            nextBtn.disabled = pages <= 1;
            nextBtn.addEventListener('click', () => {
                if (currentPage < pages) updatePage(++currentPage);
            });

            pagination.appendChild(prevBtn);
            pagination.appendChild(nextBtn);

            const pageInfo = document.createElement('div');
            pageInfo.className = 'mt-2 text-muted small';
            pageInfo.textContent = `Total halaman: ${pages}`;
            pagination.appendChild(pageInfo);

        }

        previewArea.style.display = 'block';
    });
});
