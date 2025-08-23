require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const csrf = require('csurf');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const db = require('./app/models');
const index = require('./app/routes/index');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const app = express();

// ===== Middleware parsing =====
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(express.static('public'));
app.use(methodOverride('_method'));

// ===== Cookie & Session =====
app.use(cookieParser());
app.use(session({
  secret: 'rahasia-super-aman',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// ===== Flash Messages =====
app.use(flash());
app.use((req, res, next) => {
  res.locals.errors = req.flash('errors');
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

// ===== View engine & Layout =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts'); // views/layouts.ejs

// ===== Tentukan route yang di-skip CSRF =====
app.use((req, res, next) => {
  // Skip CSRF untuk semua POST import CSV
  if (
    req.method === 'POST' &&
    req.path.match(/\/import-csv$/)
  ) {
    req.skipGlobalCsrf = true;
  }
  next();
});

// ===== CSRF Protection =====
const csrfProtection = csrf({
  cookie: true
});
app.use((req, res, next) => {
  if (req.skipGlobalCsrf) return next();
  csrfProtection(req, res, next);
});

// ===== Kirim CSRF token ke semua view (hanya jika tidak skip) =====
app.use((req, res, next) => {
  if (!req.skipGlobalCsrf) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
});

// ===== Routes =====
app.use('/', index);

// ===== Start server =====
const PORT = process.env.PORT || 3000;
db.sequelize.sync().then(() => {
  console.log('Database ready');
  app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
});

module.exports = app;
