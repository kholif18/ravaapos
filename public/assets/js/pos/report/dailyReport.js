// Reports/DailyReport - Daily sales report
import { formatCurrency, formatDate } from '../utils/formatter.js';

export async function generateDailyReport(date) {
    const targetDate = date || new Date();
    // Use ISO format YYYY-MM-DD for API compatibility
    const dateStrAPI = targetDate.toISOString().split('T')[0];
    const dateStrDisplay = formatDate(targetDate, 'date');
    
    try {
        // Try to fetch from API
        const response = await fetch(`/api/reports/daily?date=${dateStrAPI}`);
        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.error('API error, using local data:', error);
    }
    
    // Fallback to local data
    return generateLocalDailyReport(dateStrDisplay);
}

function generateLocalDailyReport(dateStr) {
    const transactions = getLocalTransactions();
    const dailyTransactions = transactions.filter(t => 
        t.date && t.date.startsWith(dateStr)
    );
    
    const paymentMethods = {
        cash: { count: 0, total: 0 },
        card: { count: 0, total: 0 },
        qris: { count: 0, total: 0 },
        transfer: { count: 0, total: 0 }
    };
    
    dailyTransactions.forEach(t => {
        const method = t.paymentMethod?.toLowerCase() || 'cash';
        if (paymentMethods[method]) {
            paymentMethods[method].count++;
            paymentMethods[method].total += t.total;
        }
    });
    
    const totalSales = dailyTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTax = dailyTransactions.reduce((sum, t) => sum + (t.tax || 0), 0);
    const totalDiscount = dailyTransactions.reduce((sum, t) => sum + (t.discount || 0), 0);
    
    return {
        date: dateStr,
        totalTransactions: dailyTransactions.length,
        totalSales: totalSales,
        totalTax: totalTax,
        totalDiscount: totalDiscount,
        netSales: totalSales - totalDiscount,
        averageTransaction: dailyTransactions.length ? totalSales / dailyTransactions.length : 0,
        paymentMethods: paymentMethods,
        transactions: dailyTransactions,
        topProducts: calculateTopProducts(dailyTransactions),
        hourlyBreakdown: calculateHourlyBreakdown(dailyTransactions)
    };
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

export function showDailyReportModal() {
    const today = new Date();
    const dateStr = formatDate(today, 'date');
    
    Swal.fire({
        title: `Laporan Harian - ${dateStr}`,
        html: '<div id="dailyReportContent">Loading...</div>',
        width: '800px',
        showConfirmButton: true,
        confirmButtonText: 'Tutup',
        showDenyButton: true,
        denyButtonText: 'Export PDF',
        didOpen: async () => {
            const report = await generateDailyReport(today);
            const content = document.getElementById('dailyReportContent');
            if (content) {
                content.innerHTML = renderDailyReportHTML(report);
            }
        }
    }).then((result) => {
        if (result.isDenied) {
            exportDailyReportToPDF();
        }
    });
}

function renderDailyReportHTML(report) {
    return `
        <div style="text-align: left;">
            <div class="row mb-3">
                <div class="col-6">
                    <div class="bg-light p-3 rounded">
                        <small class="text-muted">Total Transaksi</small>
                        <h3>${report.totalTransactions}</h3>
                    </div>
                </div>
                <div class="col-6">
                    <div class="bg-light p-3 rounded">
                        <small class="text-muted">Total Penjualan</small>
                        <h3>${formatCurrency(report.totalSales)}</h3>
                    </div>
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-4">
                    <div class="p-2">
                        <small>Pajak</small>
                        <div><strong>${formatCurrency(report.totalTax)}</strong></div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2">
                        <small>Diskon</small>
                        <div><strong>${formatCurrency(report.totalDiscount)}</strong></div>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2">
                        <small>Rata-rata</small>
                        <div><strong>${formatCurrency(report.averageTransaction)}</strong></div>
                    </div>
                </div>
            </div>
            
            <h6 class="mt-3">Metode Pembayaran</h6>
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
            
            <h6>Produk Terlaris</h6>
            <table class="table table-sm">
                <thead>
                    <tr><th>Produk</th><th>Qty</th><th>Total</th></tr>
                </thead>
                <tbody>
                    ${report.topProducts.map(p => `
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

function exportDailyReportToPDF() {
    // Implementation for PDF export
    window.print();
}