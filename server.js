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
  secret: 'rahasia-super-aman', // Ganti ke string unik
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// ===== CSRF Protection =====
const csrfProtection = csrf({
  cookie: true
});
app.use(csrfProtection);

// Kirim CSRF token ke semua view EJS
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ===== View engine setup =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts'); // views/layouts.ejs

// ===== Flash Messages =====
app.use(flash());
app.use((req, res, next) => {
  res.locals.errors = req.flash('errors');
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

// ===== Sidebar middleware =====
const sidebarMiddleware = require('./app/middleware/sidebarCategories');
app.use(sidebarMiddleware);

// ===== Routes =====
app.use('/', index);

// ===== Start server =====
const PORT = process.env.PORT || 3000;
db.sequelize.sync().then(() => {
  console.log('Database ready');
  app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));
});

module.exports = app;
