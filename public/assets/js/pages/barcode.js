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
    const container = document.getElementById('barcodePages');
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
        const pagination = document.getElementById('paginationControls');
        const pageNumbersContainer = document.getElementById('pageNumbersContainer');
        const pageInfo = document.getElementById('pageInfo');

        if (pages > 1) {
            pagination.style.display = 'block';

            let currentPage = 1;

            function renderPageNumbers() {
                pageNumbersContainer.innerHTML = '';

                // Limit pagination numbers to max 5 pages shown
                const maxPagesToShow = 5;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(pages, startPage + maxPagesToShow - 1);

                // Adjust startPage if less than 1
                if (endPage - startPage < maxPagesToShow - 1) {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                    const li = document.createElement('li');
                    li.className = 'page-item' + (i === currentPage ? ' active' : '');
                    const a = document.createElement('a');
                    a.className = 'page-link';
                    a.href = 'javascript:void(0);';
                    a.textContent = i;
                    a.addEventListener('click', () => {
                        updatePage(i);
                    });
                    li.appendChild(a);
                    pageNumbersContainer.appendChild(li);
                }
            }

            function updatePage(toPage) {
                container.querySelectorAll('.barcode-page').forEach(pg => {
                    pg.style.display = pg.dataset.page == toPage ? 'flex' : 'none';
                });
                currentPage = toPage;
                renderPageNumbers();

                // Update disabled state
                document.getElementById('prevPage').parentElement.classList.toggle('disabled', currentPage === 1);
                document.getElementById('firstPage').parentElement.classList.toggle('disabled', currentPage === 1);
                document.getElementById('nextPage').parentElement.classList.toggle('disabled', currentPage === pages);
                document.getElementById('lastPage').parentElement.classList.toggle('disabled', currentPage === pages);

                pageInfo.textContent = `Halaman ${currentPage} dari ${pages}`;
            }

            document.getElementById('prevPage').addEventListener('click', () => {
                if (currentPage > 1) updatePage(currentPage - 1);
            });
            document.getElementById('nextPage').addEventListener('click', () => {
                if (currentPage < pages) updatePage(currentPage + 1);
            });
            document.getElementById('firstPage').addEventListener('click', () => {
                updatePage(1);
            });
            document.getElementById('lastPage').addEventListener('click', () => {
                updatePage(pages);
            });

            document.getElementById('btnPrint').addEventListener('click', () => {
                const pages = container.querySelectorAll('.barcode-page');
                const currentVisiblePages = [];

                // Simpan halaman yang terlihat sekarang, sembunyikan semua halaman lainnya supaya cetak semua
                pages.forEach(page => {
                    currentVisiblePages.push(page.style.display);
                    page.style.display = 'block'; // tampilkan semua halaman untuk print
                });

                window.print();

                // Setelah print selesai, kembalikan tampilan ke hanya halaman aktif
                // print() tidak ada callback, jadi kita pakai event afterprint
                window.onafterprint = () => {
                    pages.forEach((page, i) => {
                        page.style.display = currentVisiblePages[i];
                    });
                    window.onafterprint = null; // hapus listener biar gak nambah-nambah
                };
            });
            
            // Initialize pagination
            updatePage(1);
        } else {
            pagination.style.display = 'none';
        }

        previewArea.style.display = 'block';
    });
});

