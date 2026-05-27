const {
    User
} = require('../models');

module.exports = async function firstSetup(req, res, next) {
    try {
        const adminExists = await User.findOne({
            where: {
                role: 'admin'
            }
        });

        // Kalau admin sudah ada → blok register
        if (adminExists) {
            req.flash('error', 'Pendaftaran sudah ditutup');
            return res.redirect('/login');
        }

        next();
    } catch (err) {
        console.error(err);
        req.flash('error', 'Terjadi kesalahan');
        res.redirect('/login');
    }
};