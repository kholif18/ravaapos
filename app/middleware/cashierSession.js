const { CashierSession } = require('../models');

exports.requireOpenSession = async (req, res, next) => {
    try {
        const activeSession = await CashierSession.findOne({
            where: {
                userId: req.user.id,
                status: 'open'
            }
        });

        if (!activeSession) {
            req.flash('error', 'Anda harus membuka sesi kasir terlebih dahulu sebelum menggunakan POS.');
            return res.redirect('/cashier/open');
        }

        req.cashierSession = activeSession;
        next();
    } catch (err) {
        console.error('Error in requireOpenSession middleware:', err);
        res.status(500).render('error', { message: 'Internal Server Error' });
    }
};
