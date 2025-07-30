require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const db = require('./app/models');
const index = require('./app/routes/index');

const app = express();

// ===== Middleware parsing =====
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(express.static('public'));

// ===== View engine setup =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts'); // views/layouts.ejs

// ===== Session + Flash =====
app.use(session({
  secret: 'secret-rahasia-anda', // ganti dengan string unik
  resave: false,
  saveUninitialized: false
}));

app.use(flash());

// Flash ke res.locals agar bisa diakses di EJS
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
