const {
  validationResult
} = require('express-validator');
const Item = require('../models/Item');

// API: Create item
exports.createItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({
    errors: errors.array()
  });

  const {
    name,
    price
  } = req.body;
  const item = await Item.create({
    name,
    price
  });
  res.status(201).json(item);
};

// API: Tambah stok item
exports.addStock = async (req, res) => {
  const {
    id
  } = req.params;
  const {
    stock
  } = req.body;

  const item = await Item.findByPk(id);
  if (!item) return res.status(404).json({
    message: 'Item not found'
  });

  item.stock += parseInt(stock);
  await item.save();
  res.json(item);
};

// API: Ambil semua item (JSON)
exports.getAllItems = async (req, res) => {
  const items = await Item.findAll();
  res.json(items);
};

// VIEW: Tampilkan halaman daftar item
exports.viewItems = async (req, res) => {
  try {
    const items = await Item.findAll();
    res.render('items/index', {
      title: 'Daftar Items',
      items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal memuat halaman.');
  }
};
