const db = require('../models');
const { Sale, SalePayment, Customer, User } = db;
const { Op } = require('sequelize');
const { getPaginationParams } = require('../helpers/pagination');
const transactionService = require('../services/transactionService');

exports.getOutstandingDebts = async (req, res) => {
    try {
        const { search, customerId, overdue } = req.query;
        
        // Dynamic where clause to avoid missing columns
        const where = {
            status: 'completed'
        };

        // Check columns to be safe
        const attributes = ['id', 'invoiceNumber', 'total', 'createdAt'];
        const tableInfo = await db.sequelize.getQueryInterface().describeTable('Sales');
        
        if (tableInfo.remainingAmount) {
            where.remainingAmount = { [Op.gt]: 0 };
            attributes.push('remainingAmount');
        }
        
        if (tableInfo.paymentStatus) {
            where.paymentStatus = { [Op.in]: ['unpaid', 'partial'] };
            attributes.push('paymentStatus');
        }

        if (tableInfo.dueDate) {
            attributes.push('dueDate');
            if (overdue === 'true') {
                where.dueDate = { [Op.lt]: new Date() };
            }
        }

        if (customerId) {
            where.customerId = customerId;
        }

        const include = [
            { model: Customer, as: 'customer' }
        ];

        let totalItems = 0;
        try {
            totalItems = await Sale.count({ where });
        } catch (e) {
            console.warn('Count failed, likely missing columns:', e.message);
            // If count fails, try without the problematic filters
            totalItems = await Sale.count({ where: { status: 'completed' } });
        }

        const { page, limit, offset, totalPages } = getPaginationParams(req.query.page, req.query.limit, totalItems);

        const sales = await Sale.findAll({
            attributes,
            where,
            include,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        // Add aging info
        const now = new Date();
        sales.forEach(sale => {
            const diffTime = Math.abs(now - new Date(sale.createdAt));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 30) sale.agingCategory = '0-30 hari';
            else if (diffDays <= 60) sale.agingCategory = '31-60 hari';
            else if (diffDays <= 90) sale.agingCategory = '61-90 hari';
            else sale.agingCategory = '> 90 hari';

            sale.isOverdue = sale.dueDate && new Date(sale.dueDate) < now;
        });

        res.render('piutang/index', {
            title: 'Daftar Piutang',
            sales,
            activePage: 'piutang',
            pagination: { page, limit, totalItems, totalPages }
        });
    } catch (error) {
        console.error('Error getOutstandingDebts:', error);
        res.status(500).render('error', { message: 'Gagal memuat data piutang', error });
    }
};

exports.settleDebt = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        await transactionService.settleDebt({
            ...req.body,
            userId: req.user?.id || null,
            transaction: t,
            req
        });

        await t.commit();
        res.json({ success: true, message: 'Pembayaran piutang berhasil dicatat' });
    } catch (error) {
        await t.rollback();
        console.error('Error settleDebt:', error);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.debtHistory = async (req, res) => {
    try {
        const { saleId } = req.params;
        const totalItems = await SalePayment.count({ where: { saleId } });
        const { page, limit, offset, totalPages } = getPaginationParams(req.query.page, req.query.limit, totalItems);
        const payments = await SalePayment.findAll({
            where: { saleId },
            include: [{ model: User, as: 'creator', attributes: ['name'] }],
            order: [['paidAt', 'DESC']],
            limit,
            offset
        });
        res.json({
            success: true,
            data: payments,
            pagination: { page, limit, offset, totalItems, totalPages }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memuat histori pembayaran' });
    }
};
