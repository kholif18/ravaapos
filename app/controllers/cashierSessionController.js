const { CashierSession, Sale, User, SalePayment } = require('../models');
const db = require('../models');
const { Op } = require('sequelize');
const { formatRupiah } = require('../helpers/format');

exports.index = async (req, res) => {
    try {
        const sessions = await CashierSession.findAll({
            include: [{ model: User, as: 'user', attributes: ['name'] }],
            order: [['openingTime', 'DESC']],
            limit: 50
        });

        res.render('cashier/index', {
            title: 'Sesi Kasir',
            activePage: 'cashier-session',
            sessions,
            formatRupiah
        });
    } catch (err) {
        console.error('Error fetching cashier sessions:', err);
        res.status(500).render('error', { message: 'Gagal memuat sesi kasir' });
    }
};

exports.openSession = async (req, res) => {
    try {
        // Check if user already has an open session
        const activeSession = await CashierSession.findOne({
            where: {
                userId: req.user.id,
                status: 'open'
            }
        });

        if (activeSession) {
            req.flash('info', 'Anda sudah memiliki sesi yang terbuka.');
            return res.redirect('/');
        }

        res.render('cashier/open', {
            title: 'Buka Kasir',
            activePage: 'cashier-session'
        });
    } catch (err) {
        console.error('Error loading open session page:', err);
        res.status(500).render('error', { message: 'Gagal memuat halaman buka kasir' });
    }
};

exports.startSession = async (req, res) => {
    try {
        const { openingBalance, notes } = req.body;

        const session = await CashierSession.create({
            userId: req.user.id,
            openingTime: new Date(),
            openingBalance: parseFloat(openingBalance) || 0,
            status: 'open',
            notes
        });

        req.flash('success', 'Sesi kasir berhasil dibuka.');
        res.redirect('/');
    } catch (err) {
        console.error('Error starting cashier session:', err);
        req.flash('error', 'Gagal membuka sesi kasir.');
        res.redirect('/cashier/open');
    }
};

exports.closeSession = async (req, res) => {
    try {
        const session = await CashierSession.findOne({
            where: {
                userId: req.user.id,
                status: 'open'
            }
        });

        if (!session) {
            req.flash('error', 'Tidak ada sesi kasir yang terbuka.');
            return res.redirect('/');
        }

        // Calculate summary
        const sales = await Sale.findAll({
            where: {
                sessionId: session.id,
                status: 'completed'
            }
        });

        const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total), 0);
        
        // Calculate cash sales from SalePayment
        const payments = await SalePayment.findAll({
            include: [{
                model: Sale,
                as: 'sale',
                where: { sessionId: session.id, status: 'completed' },
                attributes: []
            }],
            where: {
                [Op.and]: [
                    db.sequelize.where(db.sequelize.col('SalePayment.paymentMethod'), 'cash')
                ]
            }
        });

        const totalCashSales = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const expectedBalance = parseFloat(session.openingBalance) + totalCashSales;

        res.render('cashier/close', {
            title: 'Tutup Kasir',
            activePage: 'cashier-session',
            session,
            summary: {
                totalSales,
                totalCashSales,
                expectedBalance
            },
            formatRupiah
        });
    } catch (err) {
        console.error('Error loading close session page:', err);
        res.status(500).render('error', { message: 'Gagal memuat halaman tutup kasir' });
    }
};

exports.endSession = async (req, res) => {
    try {
        const { closingBalance, notes } = req.body;
        
        const session = await CashierSession.findOne({
            where: {
                userId: req.user.id,
                status: 'open'
            }
        });

        if (!session) {
            return res.status(400).json({ success: false, message: 'Tidak ada sesi terbuka' });
        }

        // Re-calculate to be sure
        const sales = await Sale.findAll({
            where: { sessionId: session.id, status: 'completed' }
        });
        const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total), 0);
        
        const payments = await SalePayment.findAll({
            include: [{
                model: Sale,
                as: 'sale',
                where: { sessionId: session.id, status: 'completed' },
                attributes: []
            }],
            where: {
                [Op.and]: [
                    db.sequelize.where(db.sequelize.col('SalePayment.paymentMethod'), 'cash')
                ]
            }
        });
        const totalCashSales = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        const expectedBalance = parseFloat(session.openingBalance) + totalCashSales;
        const actualClosingBalance = parseFloat(closingBalance) || 0;
        const difference = actualClosingBalance - expectedBalance;

        await session.update({
            closingTime: new Date(),
            closingBalance: actualClosingBalance,
            expectedBalance,
            totalSales,
            totalCashSales,
            difference,
            status: 'closed',
            notes: notes || session.notes
        });

        req.flash('success', 'Sesi kasir berhasil ditutup.');
        res.redirect('/cashier/sessions');
    } catch (err) {
        console.error('Error closing cashier session:', err);
        req.flash('error', 'Gagal menutup sesi kasir.');
        res.redirect('/cashier/close');
    }
};

exports.getSessionDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await CashierSession.findByPk(id, {
            include: [
                { model: User, as: 'user', attributes: ['name'] },
                { 
                    model: Sale, 
                    as: 'sales',
                    include: [{ model: User, as: 'cashier', attributes: ['name'] }]
                }
            ]
        });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan' });
        }

        res.json({ success: true, session });
    } catch (err) {
        console.error('Error fetching session detail:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail sesi' });
    }
};
