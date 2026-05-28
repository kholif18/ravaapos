const { Sale, SaleItem, Product, Category, Customer, User, SalePayment } = require('../models');
const { Op } = require('sequelize');
const { formatRupiah } = require('../helpers/format');
const db = require('../models');

exports.index = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Stats for Dashboard/Report Index
        const todaySales = await Sale.findAll({
            where: {
                createdAt: { [Op.between]: [startOfDay, endOfDay] },
                status: 'completed'
            }
        });

        const stats = {
            todayRevenue: todaySales.reduce((sum, s) => sum + parseFloat(s.total), 0),
            todayTransactions: todaySales.length,
            totalProducts: await Product.count(),
            totalCustomers: await Customer.count()
        };

        // Sales by payment method (Today)
        const paymentStats = await SalePayment.findAll({
            attributes: [
                [db.sequelize.col('SalePayment.paymentMethod'), 'paymentMethod'],
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            include: [{
                model: Sale,
                as: 'sale',
                where: {
                    createdAt: { [Op.between]: [startOfDay, endOfDay] },
                    status: 'completed'
                },
                attributes: []
            }],
            group: [db.sequelize.col('SalePayment.paymentMethod')]
        });

        // Top selling products (Today)
        const topProducts = await SaleItem.findAll({
            attributes: [
                'productId',
                [db.sequelize.fn('SUM', db.sequelize.col('qty')), 'totalQty'],
                [db.sequelize.fn('SUM', db.sequelize.col('SaleItem.subtotal')), 'totalRevenue']
            ],
            include: [
                { 
                    model: Sale, 
                    as: 'sale',
                    where: {
                        createdAt: { [Op.between]: [startOfDay, endOfDay] },
                        status: 'completed'
                    },
                    attributes: []
                },
                { model: Product, as: 'product', attributes: ['name'] }
            ],
            group: ['productId', 'product.name'],
            order: [[db.sequelize.literal('totalQty'), 'DESC']],
            limit: 5
        });

        res.render('reports/index', {
            title: 'Laporan',
            activePage: 'reports',
            stats,
            paymentStats,
            topProducts,
            formatRupiah
        });
    } catch (err) {
        console.error('Error generating report index:', err);
        res.status(500).render('error', { message: 'Gagal memuat halaman laporan: ' + err.message });
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
    // Similar to daily report but could be scoped to current session if needed
    return exports.getDailyReportAPI(req, res);
};

exports.salesReport = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const whereClause = { status: 'completed' };

        if (dateFrom && dateTo) {
            whereClause.createdAt = {
                [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')]
            };
        }

        const sales = await Sale.findAll({
            where: whereClause,
            include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });

        res.render('reports/sales', {
            title: 'Laporan Penjualan',
            activePage: 'reports',
            sales,
            dateFrom,
            dateTo,
            formatRupiah
        });
    } catch (err) {
        console.error('Error generating sales report:', err);
        res.status(500).render('error', { message: 'Gagal memuat laporan penjualan' });
    }
};
