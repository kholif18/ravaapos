const reportService = require('../services/reportService');
const { formatRupiah } = require('../helpers/format');
const { User, Customer, Category, Product, Sale, SaleItem, SalePayment } = require('../models');
const db = require('../models');
const { Op } = require('sequelize');

exports.index = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const stats = await reportService.getDashboardStats(startOfDay, endOfDay);
        const topProducts = await reportService.getBestSellers({ dateFrom: startOfDay.toISOString().split('T')[0], dateTo: endOfDay.toISOString().split('T')[0], limit: 5 });
        const paymentStats = await reportService.getPaymentReport(startOfDay.toISOString().split('T')[0], endOfDay.toISOString().split('T')[0]);

        res.render('reports/index', {
            title: 'Dashboard Laporan',
            activePage: 'reports-summary',
            stats,
            topProducts,
            paymentStats,
            formatRupiah
        });
    } catch (err) {
        console.error('Error report index:', err);
        res.status(500).render('error', { message: err.message });
    }
};

exports.getDailyReportAPI = async (req, res) => {
    try {
        const dateStr = req.query.date || new Date().toISOString().split('T')[0];
        const startOfDay = new Date(dateStr + ' 00:00:00');
        const endOfDay = new Date(dateStr + ' 23:59:59');

        const sales = await Sale.findAll({
            where: {
                createdAt: { [Op.between]: [startOfDay, endOfDay] },
                status: 'completed'
            },
            include: [
                { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['name'] }] }
            ]
        });

        const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total), 0);
        const totalTax = sales.reduce((sum, s) => sum + parseFloat(s.tax || 0), 0);
        const totalDiscount = sales.reduce((sum, s) => sum + parseFloat(s.discount || 0), 0);

        // Payment Breakdown
        const payments = await SalePayment.findAll({
            attributes: [
                [db.sequelize.col('SalePayment.paymentMethod'), 'paymentMethod'], 
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'], 
                [db.sequelize.fn('COUNT', db.sequelize.col('SalePayment.id')), 'count']
            ],
            include: [{
                model: Sale, as: 'sale', where: { createdAt: { [Op.between]: [startOfDay, endOfDay] }, status: 'completed' }, attributes: []
            }],
            group: [db.sequelize.col('SalePayment.paymentMethod')]
        });

        const paymentMethods = {
            cash: { count: 0, total: 0 },
            card: { count: 0, total: 0 },
            qris: { count: 0, total: 0 },
            transfer: { count: 0, total: 0 }
        };

        payments.forEach(p => {
            const method = p.paymentMethod;
            if (paymentMethods[method]) {
                paymentMethods[method].count = parseInt(p.get('count'));
                paymentMethods[method].total = parseFloat(p.get('total'));
            }
        });

        // Top Products
        const productSales = {};
        sales.forEach(s => {
            s.items.forEach(item => {
                const id = item.productId;
                if (!productSales[id]) {
                    productSales[id] = { id, name: item.product ? item.product.name : 'Unknown', quantity: 0, total: 0 };
                }
                productSales[id].quantity += parseInt(item.qty);
                productSales[id].total += parseFloat(item.subtotal);
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        // Hourly Breakdown
        const hourlyBreakdown = Array(24).fill().map(() => ({ count: 0, total: 0 }));
        sales.forEach(s => {
            const hour = new Date(s.createdAt).getHours();
            hourlyBreakdown[hour].count++;
            hourlyBreakdown[hour].total += parseFloat(s.total);
        });

        res.json({
            success: true,
            date: dateStr,
            totalTransactions: sales.length,
            totalSales,
            totalTax,
            totalDiscount,
            netSales: totalSales - totalTax,
            averageTransaction: sales.length ? totalSales / sales.length : 0,
            paymentMethods,
            topProducts,
            hourlyBreakdown
        });
    } catch (error) {
        console.error('API Report Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getXReadingAPI = async (req, res) => {
    return exports.getDailyReportAPI(req, res);
};

exports.salesReport = async (req, res) => {
    try {
        const filters = {
            dateFrom: req.query.dateFrom || new Date().toISOString().split('T')[0],
            dateTo: req.query.dateTo || new Date().toISOString().split('T')[0],
            cashierId: req.query.cashierId,
            customerId: req.query.customerId,
            paymentMethod: req.query.paymentMethod,
            status: req.query.status,
            limit: req.query.limit || 10,
            offset: req.query.offset || 0
        };

        const data = await reportService.getSalesReport(filters);
        const cashiers = await User.findAll({ attributes: ['id', 'name'] });
        const customers = await Customer.findAll({ attributes: ['id', 'name'] });

        if (req.xhr || req.query.ajax) {
            return res.json({ success: true, ...data });
        }

        res.render('reports/sales', {
            title: 'Laporan Penjualan',
            activePage: 'reports-sales',
            ...data,
            cashiers,
            customers,
            filters,
            formatRupiah
        });
    } catch (err) {
        console.error('Error sales report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.bestSellerReport = async (req, res) => {
    try {
        const filters = {
            dateFrom: req.query.dateFrom || new Date().toISOString().split('T')[0],
            dateTo: req.query.dateTo || new Date().toISOString().split('T')[0],
            categoryId: req.query.categoryId,
            limit: req.query.limit || 10
        };

        const items = await reportService.getBestSellers(filters);
        const categories = await Category.findAll({ attributes: ['id', 'name'] });

        if (req.xhr || req.query.ajax) {
            return res.json({ success: true, items });
        }

        res.render('reports/best-seller', {
            title: 'Laporan Produk Terlaris',
            activePage: 'reports-best-sellers',
            items,
            categories,
            filters,
            formatRupiah
        });
    } catch (err) {
        console.error('Error best seller report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.paymentReport = async (req, res) => {
    try {
        const dateFrom = req.query.dateFrom || new Date().toISOString().split('T')[0];
        const dateTo = req.query.dateTo || new Date().toISOString().split('T')[0];

        const payments = await reportService.getPaymentReport(dateFrom, dateTo);

        if (req.xhr || req.query.ajax) {
            return res.json({ success: true, payments });
        }

        res.render('reports/payments', {
            title: 'Laporan Metode Pembayaran',
            activePage: 'reports-payments',
            payments,
            filters: { dateFrom, dateTo },
            formatRupiah
        });
    } catch (err) {
        console.error('Error payment report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.cashierReport = async (req, res) => {
    try {
        const dateFrom = req.query.dateFrom || new Date().toISOString().split('T')[0];
        const dateTo = req.query.dateTo || new Date().toISOString().split('T')[0];

        const reports = await reportService.getCashierReport(dateFrom, dateTo);

        if (req.xhr || req.query.ajax) {
            return res.json({ success: true, reports });
        }

        res.render('reports/cashier', {
            title: 'Laporan Performa Kasir',
            activePage: 'reports-cashier',
            reports,
            filters: { dateFrom, dateTo },
            formatRupiah
        });
    } catch (err) {
        console.error('Error cashier report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.stockMovementReport = async (req, res) => {
    try {
        const filters = {
            dateFrom: req.query.dateFrom || new Date().toISOString().split('T')[0],
            dateTo: req.query.dateTo || new Date().toISOString().split('T')[0],
            productId: req.query.productId,
            type: req.query.type,
            limit: req.query.limit || 20,
            offset: req.query.offset || 0
        };

        const data = await reportService.getStockMovement(filters);
        const products = await Product.findAll({ attributes: ['id', 'name', 'code'], limit: 100 });

        if (req.xhr || req.query.ajax) {
            return res.json({ success: true, ...data });
        }

        res.render('reports/stock-movement', {
            title: 'Laporan Mutasi Stok',
            activePage: 'reports-stock-movement',
            ...data,
            products,
            filters,
            formatRupiah
        });
    } catch (err) {
        console.error('Error stock movement report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.lowStockReport = async (req, res) => {
    try {
        const items = await reportService.getLowStock();

        if (req.xhr || req.query.ajax) {
            return res.json({ success: true, items });
        }

        res.render('reports/low-stock', {
            title: 'Laporan Stok Menipis',
            activePage: 'reports-low-stock',
            items,
            formatRupiah
        });
    } catch (err) {
        console.error('Error low stock report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.profitLossReport = async (req, res) => {
    try {
        const dateFrom = req.query.dateFrom || new Date().toISOString().split('T')[0];
        const dateTo = req.query.dateTo || new Date().toISOString().split('T')[0];

        const data = await reportService.getProfitLoss(dateFrom, dateTo);

        if (req.xhr || req.query.ajax) {
            return res.json({ success: true, ...data });
        }

        res.render('reports/profit-loss', {
            title: 'Laporan Laba Rugi',
            activePage: 'reports-profit-loss',
            ...data,
            filters: { dateFrom, dateTo },
            formatRupiah
        });
    } catch (err) {
        console.error('Error profit loss report:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.exportSalesReport = async (req, res) => {
    try {
        const filters = {
            ...req.query,
            limit: 1000, // Large limit for export
            offset: 0
        };

        const { sales } = await reportService.getSalesReport(filters);
        
        const { Parser } = require('json2csv');
        const fields = ['invoiceNumber', 'createdAt', 'cashier.name', 'customer.name', 'paymentMethod', 'total', 'status'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(sales);

        res.header('Content-Type', 'text/csv');
        res.attachment(`sales-report-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    } catch (err) {
        console.error('Export Error:', err);
        res.status(500).send('Gagal export data: ' + err.message);
    }
};
