const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { recordAudit } = require('../helpers/audit');

exports.login = (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/login', {
        title: 'Login',
        layout: false // Don't use main layout for login page
    });
};

exports.authenticate = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { username } });

        if (!user) {
            req.flash('error', 'Username atau password salah');
            return res.redirect('/login');
        }

        // Check if password is valid (supporting both bcrypt and potentially old format if needed)
        let isValid = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            // Fallback to old helper comparison if it doesn't look like bcrypt
            const { comparePassword } = require('../helpers/auth');
            isValid = comparePassword(password, user.password);
        }

        if (!isValid) {
            req.flash('error', 'Username atau password salah');
            return res.redirect('/login');
        }

        if (!user.is_active) {
            req.flash('error', 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.');
            return res.redirect('/login');
        }

        // Update last login
        await user.update({ last_login: new Date() });

        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.name, // Mapping 'name' to 'fullName' for session
            role: user.role
        };

        // Audit Log
        await recordAudit(req, { action: 'login', entity: 'User', entityId: user.id });

        req.flash('success', `Selamat datang, ${user.name}`);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Terjadi kesalahan saat login');
        res.redirect('/login');
    }
};

exports.registerPage = (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        layout: false
    });
};

exports.register = async (req, res) => {
    try {
        const {
            name,
            username,
            email,
            password,
            terms
        } = req.body;

        // cek apakah admin sudah ada
        const adminExists = await User.findOne({
            where: {
                role: 'admin'
            }
        });

        if (adminExists) {
            req.flash('error', 'Register sudah ditutup');
            return res.redirect('/login');
        }

        if (!terms) {
            req.flash('error', 'Anda harus menyetujui Terms & Privacy Policy');
            return res.redirect('/register');
        }

        const existing = await User.findOne({
            where: {
                [Op.or]: [{
                        username
                    },
                    {
                        email
                    }
                ]
            }
        });

        if (existing) {
            req.flash('error', 'Username atau email sudah digunakan');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            username,
            email,
            password: hashedPassword,

            // USER PERTAMA = ADMIN
            role: 'admin'
        });

        req.flash('success', 'Admin berhasil dibuat, silakan login');
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal registrasi');
        res.redirect('/register');
    }
};

exports.forgotPasswordPage = (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        layout: false
    });
};

exports.forgotPassword = async (req, res) => {
    try {
        const {
            email
        } = req.body;

        const user = await User.findOne({
            where: {
                email
            }
        });

        if (!user) {
            req.flash('error', 'Email tidak ditemukan');
            return res.redirect('/forgot-password');
        }

        const token = crypto.randomBytes(32).toString('hex');

        await user.update({
            reset_token: token,
            reset_token_expired: new Date(Date.now() + 3600000)
        });

        console.log(`
Reset Password Link:
http://localhost:3000/reset-password/${token}
`);

        req.flash('success', 'Link reset password berhasil dibuat (cek terminal)');
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal memproses forgot password');
        res.redirect('/forgot-password');
    }
};

exports.resetPasswordPage = async (req, res) => {
    const user = await User.findOne({
        where: {
            reset_token: req.params.token
        }
    });

    if (!user) {
        req.flash('error', 'Token tidak valid');
        return res.redirect('/login');
    }

    res.render('auth/reset-password', {
        title: 'Reset Password',
        layout: false,
        token: req.params.token
    });
};

exports.resetPassword = async (req, res) => {
    try {
        const {
            password
        } = req.body;

        const user = await User.findOne({
            where: {
                reset_token: req.params.token
            }
        });

        if (!user) {
            req.flash('error', 'Token invalid');
            return res.redirect('/login');
        }

        if (new Date(user.reset_token_expired) < new Date()) {
            req.flash('error', 'Token expired');
            return res.redirect('/forgot-password');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await user.update({
            password: hashedPassword,
            reset_token: null,
            reset_token_expired: null
        });

        req.flash('success', 'Password berhasil direset');
        res.redirect('/login');

    } catch (error) {
        console.error(error);
        req.flash('error', 'Gagal reset password');
        res.redirect('/login');
    }
};

exports.logout = async (req, res) => {
    if (req.session.user) {
        await recordAudit(req, { action: 'logout', entity: 'User', entityId: req.session.user.id });
    }
    req.session.destroy();
    res.redirect('/login');
};
