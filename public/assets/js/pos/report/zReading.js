// Reports/ZReading - Z-Reading report (end-of-day/shift closing report)
import { formatCurrency, formatDate } from '../utils/formatter.js';

export async function generateZReading(shiftData = null) {
    const now = new Date();
    const dateStr = formatDate(now, 'date');
    
    // Get all transactions for the shift/day
    const transactions = getShiftTransactions(shiftData);
    
    // Calculate closing data
    const closingData = {
        date: dateStr,
        closingTime: formatDate(now, 'time'),
        totalTransactions: transactions.length,
        totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
        totalTax: transactions.reduce((sum, t) => sum + (t.tax || 0), 0),
        totalDiscount: transactions.reduce((sum, t) => sum + (t.discount || 0), 0),
        openingCash: shiftData?.openingCash || 500000, // Default opening cash
        closingCash: shiftData?.closingCash || calculateClosingCash(transactions),
        expectedCash: (shiftData?.openingCash || 500000) + calculateCashSales(transactions),
        cashDifference: 0,
        paymentMethods: calculatePaymentBreakdown(transactions),
        topProducts: calculateTopProducts(transactions),
        hourlyBreakdown: calculateHourlyBreakdown(transactions)
    };
    
    closingData.cashDifference = closingData.closingCash - closingData.expectedCash;
    
    return closingData;
}

function getShiftTransactions(shiftData) {
    const allTransactions = getLocalTransactions();
    
    if (shiftData?.startTime) {
        const start = new Date(shiftData.startTime);
        return allTransactions.filter(t => new Date(t.date) >= start);
    }
    
    // Default: today's transactions
    const today = new Date().toISOString().split('T')[0];
    return allTransactions.filter(t => t.date && t.date.startsWith(today));
}

function calculateCashSales(transactions) {
    const cashTransactions = transactions.filter(t => t.paymentMethod === 'cash');
    return cashTransactions.reduce((sum, t) => sum + t.total, 0);
}

function calculateClosingCash(transactions) {
    // In real scenario, this would be actual counted cash
    // For demo, calculate from cash transactions + opening cash
    return 500000 + calculateCashSales(transactions);
}

function calculatePaymentBreakdown(transactions) {
    const breakdown = {
        cash: { count: 0, total: 0 },
        card: { count: 0, total: 0 },
        qris: { count: 0, total: 0 },
        transfer: { count: 0, total: 0 }
    };
    
    transactions.forEach(t => {
        const method = t.paymentMethod?.toLowerCase() || 'cash';
        if (breakdown[method]) {
            breakdown[method].count++;
            breakdown[method].total += t.total;
        }
    });
    
    return breakdown;
}

function calculateTopProducts(transactions) {
    const productSales = {};
    
    transactions.forEach(t => {
        t.items.forEach(item => {
            if (!productSales[item.id]) {
                productSales[item.id] = {
                    id: item.id,
                    name: item.name,
                    quantity: 0,
                    total: 0
                };
            }
            productSales[item.id].quantity += item.quantity;
            productSales[item.id].total += item.price * item.quantity;
        });
    });
    
    return Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
}

function calculateHourlyBreakdown(transactions) {
    const hourly = Array(24).fill().map(() => ({ count: 0, total: 0 }));
    
    transactions.forEach(t => {
        const hour = new Date(t.date).getHours();
        hourly[hour].count++;
        hourly[hour].total += t.total;
    });
    
    return hourly;
}

function getLocalTransactions() {
    try {
        return JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    } catch {
        return [];
    }
}

export function showZReadingModal(shiftData = null) {
    Swal.fire({
        title: 'Z-Reading - End of Shift Report',
        html: '<div id="zReadingContent">Loading...</div>',
        width: '800px',
        showConfirmButton: true,
        confirmButtonText: 'Close Shift',
        showDenyButton: true,
        denyButtonText: 'Cancel',
        didOpen: async () => {
            const report = await generateZReading(shiftData);
            const content = document.getElementById('zReadingContent');
            if (content) {
                content.innerHTML = renderZReadingHTML(report);
            }
        },
        preConfirm: async () => {
            // Close shift action
            await closeShift();
            Swal.fire('Shift Closed', 'Shift telah ditutup', 'success');
        }
    });
}

function renderZReadingHTML(report) {
    const isBalanced = Math.abs(report.cashDifference) < 1000;
    const balanceClass = isBalanced ? 'text-success' : 'text-danger';
    const balanceIcon = isBalanced ? '✅' : '⚠️';
    
    return `
        <div style="text-align: left;">
            <div class="text-center mb-3">
                <strong>Shift Closing Report</strong><br>
                <small>${report.date} - ${report.closingTime}</small>
            </div>
            
            <div class="row mb-3">
                <div class="col-4">
                    <div class="bg-light p-2 rounded text-center">
                        <small>Transaksi</small>
                        <h4>${report.totalTransactions}</h4>
                    </div>
                </div>
                <div class="col-4">
                    <div class="bg-light p-2 rounded text-center">
                        <small>Total Sales</small>
                        <h4>${formatCurrency(report.totalSales)}</h4>
                    </div>
                </div>
                <div class="col-4">
                    <div class="bg-light p-2 rounded text-center">
                        <small>Net Sales</small>
                        <h4>${formatCurrency(report.totalSales - report.totalDiscount)}</h4>
                    </div>
                </div>
            </div>
            
            <div class="card mb-3 ${balanceClass}">
                <div class="card-body">
                    <h6 class="text-center">${balanceIcon} Cash Reconciliation ${balanceIcon}</h6>
                    <div class="row mt-2">
                        <div class="col-6">
                            <small>Opening Cash</small>
                            <div><strong>${formatCurrency(report.openingCash)}</strong></div>
                        </div>
                        <div class="col-6">
                            <small>Cash Sales</small>
                            <div><strong>${formatCurrency(report.paymentMethods.cash.total)}</strong></div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-6">
                            <small>Expected Cash</small>
                            <div><strong>${formatCurrency(report.expectedCash)}</strong></div>
                        </div>
                        <div class="col-6">
                            <small>Actual Cash</small>
                            <div><strong>${formatCurrency(report.closingCash)}</strong></div>
                        </div>
                    </div>
                    <div class="mt-2 pt-2 border-top text-center">
                        <small>Difference</small>
                        <div class="fs-4 ${report.cashDifference >= 0 ? 'text-success' : 'text-danger'}">
                            ${formatCurrency(Math.abs(report.cashDifference))}
                            ${report.cashDifference >= 0 ? '(Surplus)' : '(Shortage)'}
                        </div>
                    </div>
                </div>
            </div>
            
            <h6>Payment Methods</h6>
            <table class="table table-sm">
                <thead>
                    <tr><th>Method</th><th>Count</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(report.paymentMethods).map(([method, data]) => `
                        <tr>
                            <td>${method.toUpperCase()}</td>
                            <td>${data.count}</td>
                            <td>${formatCurrency(data.total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <h6>Top Products</h6>
            <table class="table table-sm">
                <thead>
                    <tr><th>Product</th><th>Qty</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${report.topProducts.slice(0, 5).map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>${p.quantity}</td>
                            <td>${formatCurrency(p.total)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function closeShift() {
    const shiftData = {
        closedAt: new Date().toISOString(),
        report: await generateZReading()
    };
    
    localStorage.setItem('last_shift_close', JSON.stringify(shiftData));
    
    // Clear today's transactions from active view (optional)
    // This would archive them in real system
}