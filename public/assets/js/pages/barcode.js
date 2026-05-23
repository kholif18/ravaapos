// barcode.js - Full working version

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
        return $(`
            <div>
                <strong>${data.name}</strong><br/>
                <small class="text-muted">
                    ${data.code} - ${data.barcode || '—'} - Rp ${parseFloat(data.salePrice || 0).toLocaleString('id-ID')}
                </small>
            </div>
        `);
    },
    templateSelection: data => data.name || data.text
});

function getSelectedProducts() {
    const selectedIds = productSelect.val();
    if (!selectedIds || selectedIds.length === 0) return [];
    return allProducts.filter(p => selectedIds.includes(p.id.toString()));
}

document.getElementById('paperSize').addEventListener('change', function () {
    const customPanel = document.getElementById('customPaperSize');
    customPanel.classList.toggle('d-none', this.value !== 'Custom');
});

// Global variables
let currentPage = 1;
let totalPages = 1;

function updatePagination() {
    const pagination = document.getElementById('paginationControls');
    const pageNumbersContainer = document.getElementById('pageNumbersContainer');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const firstBtn = document.getElementById('firstPage');
    const lastBtn = document.getElementById('lastPage');

    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'block';
    
    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

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
            a.addEventListener('click', (function(pageNum) {
                return function() { goToPage(pageNum); };
            })(i));
            li.appendChild(a);
            pageNumbersContainer.appendChild(li);
        }
    }

    if (prevBtn) {
        const prevLi = prevBtn.closest('.page-item');
        if (prevLi) prevLi.classList.toggle('disabled', currentPage === 1);
    }
    if (firstBtn) {
        const firstLi = firstBtn.closest('.page-item');
        if (firstLi) firstLi.classList.toggle('disabled', currentPage === 1);
    }
    if (nextBtn) {
        const nextLi = nextBtn.closest('.page-item');
        if (nextLi) nextLi.classList.toggle('disabled', currentPage === totalPages);
    }
    if (lastBtn) {
        const lastLi = lastBtn.closest('.page-item');
        if (lastLi) lastLi.classList.toggle('disabled', currentPage === totalPages);
    }
    
    if (pageInfo) pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    
    const container = document.getElementById('barcodePages');
    if (container) {
        const pages = container.querySelectorAll('.barcode-page');
        pages.forEach((pg, idx) => {
            pg.style.display = (idx + 1) === currentPage ? 'flex' : 'none';
        });
    }
    
    updatePagination();
}

function setupPaginationListeners() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const firstBtn = document.getElementById('firstPage');
    const lastBtn = document.getElementById('lastPage');

    if (prevBtn) {
        const newPrev = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        newPrev.addEventListener('click', () => {
            if (currentPage > 1) goToPage(currentPage - 1);
        });
    }

    if (nextBtn) {
        const newNext = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        newNext.addEventListener('click', () => {
            if (currentPage < totalPages) goToPage(currentPage + 1);
        });
    }

    if (firstBtn) {
        const newFirst = firstBtn.cloneNode(true);
        firstBtn.parentNode.replaceChild(newFirst, firstBtn);
        newFirst.addEventListener('click', () => {
            goToPage(1);
        });
    }

    if (lastBtn) {
        const newLast = lastBtn.cloneNode(true);
        lastBtn.parentNode.replaceChild(newLast, lastBtn);
        newLast.addEventListener('click', () => {
            goToPage(totalPages);
        });
    }
}

// Function to get proper barcode format
function getBarcodeFormat(barcodeValue, selectedType) {
    const cleanValue = barcodeValue.toString().replace(/[^0-9]/g, '');
    
    if (selectedType === 'EAN13') return 'EAN13';
    if (selectedType === 'UPC') return 'UPC';
    if (selectedType === 'CODE128') return 'CODE128';
    
    // Auto detect
    if (cleanValue.length === 13) return 'EAN13';
    if (cleanValue.length === 12) return 'UPC';
    if (cleanValue.length === 8) return 'EAN8';
    return 'CODE128';
}

// Function to create a single barcode label
function createLabel(product, options) {
    const {
        labelWidth, labelHeight, showName, showPrice, showCode, showTax, border,
        barcodeHeight, nameFontSize, priceFontSize, barcodeType
    } = options;
    
    const label = document.createElement('div');
    label.className = 'barcode-label';
    label.style.cssText = `
        width: ${labelWidth}mm;
        height: ${labelHeight}mm;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        padding: 4px;
        margin: 0;
        background: white;
        ${border ? 'border: 1px solid #ccc; border-radius: 4px;' : ''}
    `;
    
    // Product Name
    if (showName) {
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `
            font-size: ${nameFontSize}px;
            font-weight: bold;
            text-align: center;
            word-break: break-word;
            margin-bottom: 2px;
        `;
        nameDiv.textContent = product.name;
        label.appendChild(nameDiv);
    }
    
    // SKU/Code
    if (showCode) {
        const codeDiv = document.createElement('div');
        codeDiv.style.cssText = `
            font-size: 9px;
            color: #666;
            text-align: center;
            margin-bottom: 2px;
        `;
        codeDiv.textContent = product.code;
        label.appendChild(codeDiv);
    }
    
    // Barcode - Use img from canvas
    let barcodeValue = product.barcode || product.code;
    if (barcodeValue) {
        barcodeValue = barcodeValue.toString().replace(/[^0-9]/g, '');
        
        if (barcodeValue.length >= 6) {
            const format = getBarcodeFormat(barcodeValue, barcodeType);
            
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = barcodeHeight;
                
                JsBarcode(canvas, barcodeValue, {
                    format: format,
                    width: 2,
                    height: barcodeHeight,
                    displayValue: false,
                    margin: 0,
                    background: '#ffffff',
                    lineColor: '#000000'
                });
                
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');
                img.style.cssText = `
                    width: 90%;
                    height: auto;
                    margin: 2px 0;
                `;
                label.appendChild(img);
            } catch(e) {
                const fallback = document.createElement('div');
                fallback.style.cssText = 'font-size: 10px; font-family: monospace;';
                fallback.textContent = barcodeValue;
                label.appendChild(fallback);
            }
        }
    }
    
    // Price
    if (showPrice) {
        const priceDiv = document.createElement('div');
        priceDiv.style.cssText = `
            font-size: ${priceFontSize}px;
            font-weight: bold;
            text-align: center;
            margin-top: 2px;
            color: #2c7da0;
        `;
        priceDiv.textContent = `Rp ${parseFloat(product.salePrice || 0).toLocaleString('id-ID')}`;
        label.appendChild(priceDiv);
    }
    
    // Tax - PASTIKAN MUNCUL
    if (showTax && product.tax && parseFloat(product.tax) > 0) {
        const taxDiv = document.createElement('div');
        taxDiv.style.cssText = `
        font-size: 8px;
        color: #999;
        text-align: center;
        margin-top: 2px;
    `;
        // Tampilkan persentase pajak dari database
        taxDiv.textContent = `Pajak: ${product.tax}%`;
        label.appendChild(taxDiv);
    } else if (showTax && product.tax === 0) {
        // Optional: Tampilkan pesan jika pajak 0
        const taxDiv = document.createElement('div');
        taxDiv.style.cssText = `
        font-size: 8px;
        color: #999;
        text-align: center;
        margin-top: 2px;
    `;
        taxDiv.textContent = `Pajak: 0%`;
        label.appendChild(taxDiv);
    }
    
    return label;
}

// Setup print button
function setupPrintButton() {
    const printBtn = document.getElementById('btnPrint');
    if (!printBtn) return;
    
    const newPrintBtn = printBtn.cloneNode(true);
    printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
    
    newPrintBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        const container = document.getElementById('barcodePages');
        if (!container || container.children.length === 0) {
            alert('Tidak ada barcode untuk dicetak. Silakan generate preview terlebih dahulu.');
            return;
        }
        
        // Create print window
        const printWindow = window.open('', '_blank', 'width=800,height=600,toolbar=yes,scrollbars=yes');
        if (!printWindow) {
            alert('Popup blocker mencegah print. Izinkan popup untuk website ini.');
            return;
        }
        
        // Get all pages HTML
        const pages = container.querySelectorAll('.barcode-page');
        let pagesHtml = '';
        
        // Get paper size
        const paperSize = document.getElementById('paperSize').value;
        let paperWidth = '210mm';
        let paperHeight = '297mm';
        if (paperSize === 'Letter') {
            paperWidth = '216mm';
            paperHeight = '279mm';
        } else if (paperSize === 'Custom') {
            paperWidth = parseFloat(document.getElementById('paperWidth').value) + 'mm';
            paperHeight = parseFloat(document.getElementById('paperHeight').value) + 'mm';
        }
        
        pages.forEach(page => {
            const pageClone = page.cloneNode(true);
            pageClone.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                align-content: flex-start;
                width: ${paperWidth};
                min-height: ${paperHeight};
                margin: 0 auto;
                background: white;
                page-break-after: always;
            `;
            pagesHtml += pageClone.outerHTML;
        });
        
        // Create print document
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Barcode Produk</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        margin: 0;
                        padding: 0;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${pagesHtml}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 500);
                    };
                <\/script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('btnGenerateBarcodePreview');
    const container = document.getElementById('barcodePages');
    const previewArea = document.getElementById('barcodePreviewArea');
    
    // Setup print button
    setupPrintButton();

    generateBtn.addEventListener('click', () => {
        const selectedProducts = getSelectedProducts();
        
        if (selectedProducts.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">Silakan pilih minimal 1 produk terlebih dahulu.</div>';
            previewArea.style.display = 'block';
            return;
        }
        
        // Get all options
        const copies = parseInt(document.getElementById('copiesPerProduct').value) || 1;
        const showName = document.getElementById('optName').checked;
        const showPrice = document.getElementById('optPrice').checked;
        const showCode = document.getElementById('optCode').checked;
        const showTax = document.getElementById('optTax').checked;
        const border = document.getElementById('optBorder').checked;
        const barcodeHeight = parseInt(document.getElementById('barcodeHeight').value) || 30;
        const nameFontSize = parseInt(document.getElementById('nameFontSize').value) || 11;
        const priceFontSize = parseInt(document.getElementById('priceFontSize').value) || 14;
        const barcodeType = document.getElementById('barcodeType').value;

        const labelWidth = parseFloat(document.getElementById('labelWidth').value) || 63;
        const labelHeight = parseFloat(document.getElementById('labelHeight').value) || 40;
        const columns = parseInt(document.getElementById('columns').value) || 3;
        const marginTop = parseFloat(document.getElementById('marginTop').value) || 5;
        const marginLeft = parseFloat(document.getElementById('marginLeft').value) || 5;
        const marginBottom = parseFloat(document.getElementById('marginBottom')?.value) || 5;
        const marginRight = parseFloat(document.getElementById('marginRight')?.value) || 5;
        const rowSpacing = parseFloat(document.getElementById('rowSpacing').value) || 2;
        const colSpacing = parseFloat(document.getElementById('colSpacing').value) || 2;

        const paperSize = document.getElementById('paperSize').value;
        let paperHeight = 297, paperWidth = 210;
        if (paperSize === 'Letter') {
            paperWidth = 216;
            paperHeight = 279;
        } else if (paperSize === 'Custom') {
            paperWidth = parseFloat(document.getElementById('paperWidth').value) || 210;
            paperHeight = parseFloat(document.getElementById('paperHeight').value) || 297;
        }
        
        const options = {
            labelWidth, labelHeight, showName, showPrice, showCode, showTax, border,
            barcodeHeight, nameFontSize, priceFontSize, barcodeType, copies
        };
        
        // Generate all labels
        const allLabels = [];
        for (const product of selectedProducts) {
            for (let i = 0; i < copies; i++) {
                const label = createLabel(product, options);
                allLabels.push(label);
            }
        }
        
        if (allLabels.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">Tidak ada label yang dapat dibuat.</div>';
            previewArea.style.display = 'block';
            return;
        }
        
        // Calculate layout - PERBAIKI PERHITUNGAN KOLOM
        const availableWidth = paperWidth - marginLeft - marginRight;
        const availableHeight = paperHeight - marginTop - marginBottom;
        
        // Hitung jumlah kolom berdasarkan lebar yang tersedia
        let colsPerPage = columns;
        const maxColsByWidth = Math.floor((availableWidth + colSpacing) / (labelWidth + colSpacing));
        if (colsPerPage > maxColsByWidth) {
            colsPerPage = Math.max(1, maxColsByWidth);
        }
        
        // Hitung jumlah baris
        const rowsPerPage = Math.floor((availableHeight + rowSpacing) / (labelHeight + rowSpacing));
        const labelsPerPage = Math.max(1, colsPerPage * rowsPerPage);
        totalPages = Math.ceil(allLabels.length / labelsPerPage);
        
        console.log('Layout:', { availableWidth, availableHeight, colsPerPage, rowsPerPage, labelsPerPage, totalPages });
        
        // Clear container
        container.innerHTML = '';
        
        let labelIndex = 0;
        
        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
            const page = document.createElement('div');
            page.className = 'barcode-page';
            page.style.cssText = `
                display: ${pageNum === 0 ? 'flex' : 'none'};
                flex-wrap: wrap;
                align-content: flex-start;
                justify-content: flex-start;
                width: ${paperWidth}mm;
                min-height: ${paperHeight}mm;
                background: white;
                box-shadow: 0 0 3px rgba(0,0,0,0.1);
                box-sizing: border-box;
                padding: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
                gap: ${rowSpacing}mm ${colSpacing}mm;
            `;
            
            let labelsOnPage = 0;
            for (let row = 0; row < rowsPerPage && labelIndex < allLabels.length; row++) {
                for (let col = 0; col < colsPerPage && labelIndex < allLabels.length; col++) {
                    const label = allLabels[labelIndex];
                    label.style.margin = '0';
                    page.appendChild(label);
                    labelIndex++;
                    labelsOnPage++;
                }
            }
            
            if (labelsOnPage > 0) {
                container.appendChild(page);
            }
        }
        
        // Setup pagination
        currentPage = 1;
        if (totalPages > 1) {
            setupPaginationListeners();
        }
        updatePagination();
        
        previewArea.style.display = 'block';
    });
});