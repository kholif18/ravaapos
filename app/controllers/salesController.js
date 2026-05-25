const { Sale, SaleItem, Customer, Product } = require('../models');
const { Op } = require('sequelize');
const { formatRupiah } = require('../helpers/format');
const pagination = require('../helpers/pagination');

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
        res.status(500).render('error', { message: 'Gagal memuat riwayat transaksi' });
    }
};

exports.getDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await Sale.findByPk(id, {
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
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const sale = await Sale.findByPk(id);
        if (!sale) {
            return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
        }

        if (sale.status === 'void') {
            return res.status(400).json({ success: false, message: 'Transaksi sudah dibatalkan sebelumnya' });
        }

        // Update status to void
        await sale.update({
            status: 'void',
            voidReason: reason,
            voidedAt: new Date()
        });

        // NOTE: In a real system, you would also need to revert stock levels here
        // if the items sold were physical products.
        
        res.json({ success: true, message: 'Transaksi berhasil dibatalkan' });
    } catch (err) {
        console.error('Error voiding sale:', err);
        res.status(500).json({ success: false, message: 'Gagal membatalkan transaksi' });
    }
};