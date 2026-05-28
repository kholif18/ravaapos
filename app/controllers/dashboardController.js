const { Sale, Product, Customer, SaleItem, CashierSession } = require('../models');
const { Op } = require('sequelize');
const { formatRupiah } = require('../helpers/format');
const db = require('../models');

exports.index = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Active Session
        const activeSession = await CashierSession.findOne({
            where: {
                userId: req.user.id,
                status: 'open'
            }
        });

        // Basic Stats
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

        // Recent Sales
        const recentSales = await Sale.findAll({
            include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        // Low Stock Products
        const lowStockProducts = await Product.findAll({
            where: {
                type: 'fisik',
                stock: { [Op.lte]: 10 }
            },
            limit: 5,
            order: [['stock', 'ASC']]
        });

        res.render('dashboard/index', {
            title: 'Dashboard',
            activePage: 'dashboard',
            stats,
            recentSales,
            lowStockProducts,
            activeSession,
            formatRupiah
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
        res.status(500).render('error', { message: 'Gagal memuat dashboard' });
    }
};
