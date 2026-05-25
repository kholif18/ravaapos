// Payment/ReceiptPrinter - Fungsi untuk mencetak struk
import {
    formatCurrency,
    formatDate
} from '../utils/formatter.js';

export function printReceipt(transaction, options = {}) {
    const {
        copies = 1,
            paperSize = '80mm', // '80mm' or '58mm'
            showLogo = true,
            showQR = false
    } = options;

    const receiptHtml = generateReceiptHTML(transaction, {
        showLogo,
        showQR,
        paperSize
    });

    for (let i = 0; i < copies; i++) {
        printReceiptWindow(receiptHtml);

        // Small delay between copies
        if (i < copies - 1) {
            setTimeout(() => {}, 500);
        }
    }
}

function generateReceiptHTML(transaction, options) {
    const {
        showLogo,
        showQR,
        paperSize
    } = options;
    const is58mm = paperSize === '58mm';

    const itemsHtml = transaction.items.map(item => `
        <tr>
            <td style="padding: 2px 0; font-size: ${is58mm ? '10px' : '12px'};">${item.name}</td>
            <td style="text-align: center; padding: 2px 4px;">${item.quantity}x</td>
            <td style="text-align: right; padding: 2px 0;">${formatCurrency(item.price, false)}</td>
            <td style="text-align: right; padding: 2px 0 2px 8px;">${formatCurrency(item.price * item.quantity, false)}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Struk Pembayaran</title>
            <meta charset="UTF-8">
            <style>
                @media print {
                    @page {
                        size: ${paperSize === '58mm' ? '58mm' : '80mm'} auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 8px;
                        font-family: 'Courier New', monospace;
                    }
                    .no-print {
                        display: none;
                    }
                }
                
                body {
                    font-family: 'Courier New', monospace;
                    font-size: ${is58mm ? '11px' : '12px'};
                    width: ${is58mm ? '58mm' : '80mm'};
                    margin: 0 auto;
                    padding: 8px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed #000;
                }
                
                .store-name {
                    font-size: ${is58mm ? '14px' : '16px'};
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                
                .store-address {
                    font-size: ${is58mm ? '9px' : '10px'};
                    color: #666;
                }
                
                .transaction-info {
                    margin: 10px 0;
                    padding: 5px 0;
                    border-bottom: 1px dotted #000;
                }
                
                .items-table {
                    width: 100%;
                    margin: 10px 0;
                    border-collapse: collapse;
                }
                
                .items-table th {
                    font-size: ${is58mm ? '10px' : '11px'};
                    text-align: left;
                    border-bottom: 1px dashed #000;
                    padding: 4px 0;
                }
                
                .total-section {
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px dashed #000;
                }
                
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 4px 0;
                }
                
                .grand-total {
                    font-size: ${is58mm ? '14px' : '16px'};
                    font-weight: bold;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #000;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px dashed #000;
                    font-size: ${is58mm ? '9px' : '10px'};
                }
                
                .qr-code {
                    text-align: center;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                ${showLogo ? `
                    <div class="store-name">TOKO KAMI</div>
                    <div class="store-address">Jl. Contoh No. 123, Kota</div>
                    <div class="store-address">Telp: (021) 1234-5678</div>
                ` : ''}
            </div>
            
            <div class="transaction-info">
                <div>${transaction.id}</div>
                <div>${formatDate(transaction.date, 'datetime')}</div>
                <div>Kasir: Admin</div>
                <div>Customer: ${transaction.customerName}</div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Harga</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div class="total-section">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>${formatCurrency(transaction.subtotal, false)}</span>
                </div>
                ${transaction.discount > 0 ? `
                <div class="total-row">
                    <span>Diskon</span>
                    <span>-${formatCurrency(transaction.discount, false)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>Pajak 11%</span>
                    <span>${formatCurrency(transaction.tax, false)}</span>
                </div>
                <div class="grand-total">
                    <div class="total-row">
                        <span><strong>TOTAL</strong></span>
                        <span><strong>${formatCurrency(transaction.total, false)}</strong></span>
                    </div>
                </div>
                ${transaction.change > 0 ? `
                <div class="total-row">
                    <span>Tunai</span>
                    <span>${formatCurrency(transaction.paymentAmount, false)}</span>
                </div>
                <div class="total-row">
                    <span>Kembali</span>
                    <span>${formatCurrency(transaction.change, false)}</span>
                </div>
                ` : ''}
            </div>
            
            ${showQR ? `
            <div class="qr-code">
                <!-- Placeholder for QR code -->
                <div>Scan untuk review</div>
            </div>
            ` : ''}
            
            <div class="footer">
                <div>Terima kasih telah berbelanja</div>
                <div>Barang yang sudah dibeli tidak dapat dikembalikan</div>
                <div>💳 ⭐ 🛍️</div>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 8px 16px;">🖨️ Cetak</button>
                <button onclick="window.close()" style="padding: 8px 16px;">✖️ Tutup</button>
            </div>
            
            <script>
                // Auto print
                window.onload = function() {
                    window.print();
                    // Close after print (optional)
                    window.onafterprint = function() {
                        // window.close();
                    };
                };
            <\/script>
        </body>
        </html>
    `;
}

function printReceiptWindow(html) {
    const printWindow = window.open('', '_blank', 'width=400,height=600,toolbar=no,menubar=no');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        alert('Popup blocker mungkin mencegah pencetakan. Izinkan popup untuk website ini.');
    }
}

// Preview receipt before printing
export function previewReceipt(transaction) {
    const html = generateReceiptHTML(transaction, {
        showLogo: true,
        paperSize: '80mm'
    });
    const previewWindow = window.open('', '_blank', 'width=400,height=600');
    if (previewWindow) {
        previewWindow.document.write(html);
        previewWindow.document.close();
    }
}

// Export receipt as PDF (using browser print)
export function exportToPDF(transaction) {
    const html = generateReceiptHTML(transaction, {
        showLogo: true,
        paperSize: '80mm'
    });
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Struk ${transaction.id}</title>
                <style>
                    @media print {
                        @page {
                            size: 80mm auto;
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() {
                        window.print();
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
}