// Transaction/TransactionApi - API calls for transaction management
import {
    showError
} from '../ui/notifications.js';

const API_BASE = '/api';

// Save transaction to backend
export async function saveTransaction(transaction) {
    try {
        // Save to localStorage as fallback/offline mode
        saveToLocalStorage(transaction);

        // Try to save to backend
        const response = await fetch(`${API_BASE}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken()
            },
            body: JSON.stringify(transaction)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        // Sync offline transactions if any
        await syncOfflineTransactions();

        return result;
    } catch (error) {
        console.error('Failed to save transaction:', error);
        // Already saved to localStorage, queue for sync
        queueForSync(transaction);
        showError('Transaksi disimpan secara lokal. Akan disinkronkan saat koneksi tersambung.');
        return transaction;
    }
}

// Get transaction history
export async function getTransactionHistory(params = {}) {
    const {
        startDate,
        endDate,
        page = 1,
        limit = 20
    } = params;

    try {
        let url = `${API_BASE}/transactions?page=${page}&limit=${limit}`;
        if (startDate) url += `&start=${startDate}`;
        if (endDate) url += `&end=${endDate}`;

        const response = await fetch(url, {
            headers: {
                'X-CSRF-TOKEN': getCsrfToken()
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        // Merge with local transactions
        const localTransactions = getLocalTransactions();
        const allTransactions = [...result.data, ...localTransactions];

        return {
            ...result,
            data: allTransactions
        };
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        // Fallback to local storage
        return {
            data: getLocalTransactions(),
            total: getLocalTransactions().length,
            page: 1,
            limit: limit
        };
    }
}

// Get transaction by ID
export async function getTransactionById(id) {
    try {
        const response = await fetch(`${API_BASE}/transactions/${id}`, {
            headers: {
                'X-CSRF-TOKEN': getCsrfToken()
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch transaction:', error);
        // Try local storage
        const local = getLocalTransactions();
        return local.find(t => t.id === id) || null;
    }
}

// Void transaction
export async function voidTransaction(transactionId, reason) {
    try {
        const response = await fetch(`${API_BASE}/transactions/${transactionId}/void`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken()
            },
            body: JSON.stringify({
                reason,
                voidedBy: getCurrentUser()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Remove from local storage if exists
        removeFromLocalStorage(transactionId);

        return await response.json();
    } catch (error) {
        console.error('Failed to void transaction:', error);
        showError('Gagal membatalkan transaksi');
        throw error;
    }
}

// Local storage functions (offline support)
function saveToLocalStorage(transaction) {
    const transactions = getLocalTransactions();
    transactions.unshift(transaction);

    // Keep only last 100 transactions
    if (transactions.length > 100) transactions.pop();

    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
}

function getLocalTransactions() {
    try {
        return JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    } catch {
        return [];
    }
}

function removeFromLocalStorage(transactionId) {
    const transactions = getLocalTransactions();
    const filtered = transactions.filter(t => t.id !== transactionId);
    localStorage.setItem('pos_transactions', JSON.stringify(filtered));
}

// Offline sync queue
const syncQueue = [];

function queueForSync(transaction) {
    syncQueue.push(transaction);
    localStorage.setItem('pos_sync_queue', JSON.stringify(syncQueue));
}

async function syncOfflineTransactions() {
    const queue = JSON.parse(localStorage.getItem('pos_sync_queue') || '[]');
    if (queue.length === 0) return;

    for (const transaction of queue) {
        try {
            const response = await fetch(`${API_BASE}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken()
                },
                body: JSON.stringify(transaction)
            });

            if (response.ok) {
                // Remove from queue
                const index = syncQueue.findIndex(t => t.id === transaction.id);
                if (index !== -1) syncQueue.splice(index, 1);
            }
        } catch (error) {
            console.error('Sync failed for transaction:', transaction.id);
        }
    }

    localStorage.setItem('pos_sync_queue', JSON.stringify(syncQueue));
}

// Helper functions
function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

function getCurrentUser() {
    return localStorage.getItem('pos_user') || 'Admin';
}

// Daily report
export async function getDailyReport(date) {
    const dateStr = date || new Date().toISOString().split('T')[0];

    try {
        const response = await fetch(`${API_BASE}/reports/daily?date=${dateStr}`, {
            headers: {
                'X-CSRF-TOKEN': getCsrfToken()
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch daily report:', error);
        // Generate report from local data
        return generateLocalDailyReport(dateStr);
    }
}

function generateLocalDailyReport(dateStr) {
    const transactions = getLocalTransactions();
    const dailyTransactions = transactions.filter(t =>
        t.date && t.date.startsWith(dateStr)
    );

    const totalSales = dailyTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTax = dailyTransactions.reduce((sum, t) => sum + (t.tax || 0), 0);
    const totalDiscount = dailyTransactions.reduce((sum, t) => sum + (t.discount || 0), 0);

    return {
        date: dateStr,
        totalTransactions: dailyTransactions.length,
        totalSales: totalSales,
        totalTax: totalTax,
        totalDiscount: totalDiscount,
        averageTransaction: dailyTransactions.length ? totalSales / dailyTransactions.length : 0,
        transactions: dailyTransactions
    };
}

// Check connection and sync
window.addEventListener('online', () => {
    console.log('Network connected, syncing transactions...');
    syncOfflineTransactions();
});