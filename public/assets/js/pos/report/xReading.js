// Reports/XReading - X-Reading report (mid-shift report)
import { formatCurrency, formatDate } from '../utils/formatter.js';

export async function generateXReading() {
    const today = new Date();
    const dateStrAPI = today.toISOString().split('T')[0];
    const dateStrDisplay = formatDate(today, 'date');
    
    try {
        const response = await fetch(`/api/reports/x-reading?date=${dateStrAPI}`);
        if (response.ok) {
            const data = await response.json();
            // Ensure compatibility with the expected format
            return {
                ...data,
                time: formatDate(new Date(), 'time'),
                cashInDrawer: data.paymentMethods?.cash?.total || 0,
                expectedCash: data.paymentMethods?.cash?.total || 0,
                difference: 0,
                isBalanced: true
            };
        }
    } catch (error) {
        console.error('API error for X-Reading:', error);
    }

    // Fallback to local data
    const transactions = getTodayTransactions();
    
    const cashInDrawer = calculateCashInDrawer(transactions);
    const expectedCash = calculateExpectedCash(transactions);
    const difference = cashInDrawer - expectedCash;
    
    return {
        date: dateStrDisplay,
        time: formatDate(new Date(), 'time'),
        totalTransactions: transactions.length,
        totalSales: transactions.reduce((sum, t) => sum + t.total, 0),
        totalTax: transactions.reduce((sum, t) => sum + (t.tax || 0), 0),
        totalDiscount: transactions.reduce((sum, t) => sum + (t.discount || 0), 0),
        cashInDrawer: cashInDrawer,
        expectedCash: expectedCash,
        difference: difference,
        isBalanced: Math.abs(difference) < 1000, // tolerance 1000
        paymentMethods: calculatePaymentBreakdown(transactions),
        transactions: transactions
    };
}

function getTodayTransactions() {
    const today = new Date().toISOString().split('T')[0];
    const allTransactions = getLocalTransactions();
    return allTransactions.filter(t => t.date && t.date.startsWith(today));
}

function calculateCashInDrawer(transactions) {
    // This would normally come from actual cash count
    // For demo, calculate from cash transactions
    const cashTransactions = transactions.filter(t => t.paymentMethod === 'cash');
    return cashTransactions.reduce((sum, t) => sum + t.total, 0);
}

function calculateExpectedCash(transactions) {
    // Expected cash = sum of all cash transactions
    return calculateCashInDrawer(transactions);
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

function getLocalTransactions() {
    try {
        return JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    } catch {
        return [];
    }
}

export function showXReadingModal() {
    Swal.fire({
        title: 'X-Reading Report',
        html: '<div id="xReadingContent">Loading...</div>',
        width: '700px',
        showConfirmButton: true,
        confirmButtonText: 'Tutup',
        showDenyButton: true,
        denyButtonText: 'Cetak',
        didOpen: async () => {
            const report = await generateXReading();
            const content = document.getElementById('xReadingContent');
            if (content) {
                content.innerHTML = renderXReadingHTML(report);
            }
        }
    });
}

function renderXReadingHTML(report) {
    const balanceClass = report.isBalanced ? 'text-success' : 'text-danger';
    const balanceIcon = report.isBalanced ? '✅' : '⚠️';
    
    return `
        <div style="text-align: left;">
            <div class="text-center mb-3">
                <strong>${report.date} - ${report.time}</strong>
            </div>
            
            <div class="row mb-3">
                <div class="col-6">
                    <div class="bg-light p-3 rounded text-center">
                        <small class="text-muted">Total Transaksi</small>
                        <h3>${report.totalTransactions}</h3>
                    </div>
                </div>
                <div class="col-6">
                    <div class="bg-light p-3 rounded text-center">
                        <small class="text-muted">Total Penjualan</small>
                        <h3>${formatCurrency(report.totalSales)}</h3>
                    </div>
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-4">
                    <div class="p-2 text-center">
                        <small>Pajak</small>
                        <div><strong>${formatCurrency(report.totalTax)}</strong></div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2 text-center">
                        <small>Diskon</small>
                        <div><strong>${formatCurrency(report.totalDiscount)}</strong></div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2 text-center">
                        <small>Net Sales</small>
                        <div><strong>${formatCurrency(report.totalSales - report.totalDiscount)}</strong></div>
                    </div>
                </div>
            </div>
            
            <div class="card mb-3 ${balanceClass}">
                <div class="card-body text-center">
                    <h5>${balanceIcon} Cash Reconciliation ${balanceIcon}</h5>
                    <div class="row mt-2">
                        <div class="col-6">
                            <small>Cash in Drawer</small>
                            <div><strong>${formatCurrency(report.cashInDrawer)}</strong></div>
                        </div>
                        <div class="col-6">
                            <small>Expected Cash</small>
                            <div><strong>${formatCurrency(report.expectedCash)}</strong></div>
                        </div>
                    </div>
                    <div class="mt-2 pt-2 border-top">
                        <small>Difference</small>
                        <div class="fs-4 ${report.difference >= 0 ? 'text-success' : 'text-danger'}">
                            ${formatCurrency(Math.abs(report.difference))}
                            ${report.difference >= 0 ? '(Surplus)' : '(Shortage)'}
                        </div>
                    </div>
                </div>
            </div>
            
            <h6>Metode Pembayaran</h6>
            <table class="table table-sm">
                <thead>
                    <tr><th>Metode</th><th>Jumlah</th><th>Total</th></tr>
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
        </div>
    `;
}