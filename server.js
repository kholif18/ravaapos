require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const db = require('./config/database');
const expressLayouts = require('express-ejs-layouts');
const index = require('./app/routes/index');

// Middleware
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(express.static('public'));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts'); // refers to views/layouts.ejs

// Routes
app.use('/', index);

require('./app/models/Item');

// Start server
const PORT = process.env.PORT || 3000;
db.sync().then(() => {
  console.log('Database connected');
  app.listen(PORT, () => console.log(`RavaaPOS running on http://localhost:${PORT}`));
});
