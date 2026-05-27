exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user; // Set req.user for controllers
        res.locals.user = req.session.user; // Make user available in all views
        return next();
    }
    res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses (Admin Only)' });
    }
    req.flash('error', 'Anda tidak memiliki akses ke halaman ini (Admin Only)');
    res.redirect('/');
};

exports.isKasir = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'kasir' || req.session.user.role === 'admin')) {
        return next();
    }
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses' });
    }
    req.flash('error', 'Anda tidak memiliki akses ke halaman ini');
    res.redirect('/');
};
