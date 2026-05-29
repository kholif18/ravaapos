const { Sale, SaleItem, Customer, Product } = require('../models');
const { Op } = require('sequelize');
const { formatRupiah } = require('../helpers/format');
const pagination = require('../helpers/pagination');
const db = require('../models');
const transactionService = require('../services/transactionService');

exports.index = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', dateFrom, dateTo } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (search) {
            whereClause.invoiceNumber = { [Op.like]: `%${search}%` };
        }

        if (dateFrom && dateTo) {
            whereClause.createdAt = {
                [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')]
            };
        } else if (dateFrom) {
            whereClause.createdAt = { [Op.gte]: new Date(dateFrom) };
        } else if (dateTo) {
            whereClause.createdAt = { [Op.lte]: new Date(dateTo + ' 23:59:59') };
        }

        const { count, rows: sales } = await Sale.findAndCountAll({
            attributes: ['id', 'invoiceNumber', 'total', 'createdAt', 'paymentMethod'],
            where: whereClause,
            include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        const paginatedData = pagination.getPaginationParams(page, limit, count);

        res.render('sales/index', {
            title: 'Riwayat Transaksi',
            activePage: 'sales',
            sales,
            paginatedData,
            search,
            dateFrom,
            dateTo,
            formatRupiah
        });
    } catch (err) {
        console.error('Error fetching sales history:', err);
        res.status(500).render('error', { message: 'Gagal memuat riwayat transaksi: ' + err.message });
    }
};

exports.getDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await Sale.findByPk(id, {
            attributes: ['id', 'invoiceNumber', 'total', 'subtotal', 'tax', 'discount', 'amountReceived', 'change', 'notes', 'createdAt', 'paymentMethod'],
            include: [
                { model: Customer, as: 'customer' },
                { 
                    model: SaleItem, 
                    as: 'items',
                    include: [{ model: Product, as: 'product' }]
                }
            ]
        });

        if (!sale) {
            return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
        }

        res.json({ success: true, sale });
    } catch (err) {
        console.error('Error fetching sale detail:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail transaksi' });
    }
};

exports.voidSale = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { reason } = req.body;

        await transactionService.voidTransaction({
            saleId: id,
            reason,
            userId: req.user?.id || null,
            transaction: t,
            req
        });

        await t.commit();
        
        res.json({ success: true, message: 'Transaksi berhasil dibatalkan' });
    } catch (err) {
        await t.rollback();
        console.error('Error voiding sale:', err);
        res.status(400).json({ success: false, message: err.message || 'Gagal membatalkan transaksi' });
    }
};
