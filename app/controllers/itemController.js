const {
  validationResult
} = require('express-validator');
const {
  Item,
  Category
} = require('../models');
const {
  Op
} = require('sequelize');

// GET view
exports.viewItems = async (req, res) => {
  try {
    const {
      category,
      q
    } = req.query;
    const categories = await Category.findAll({
      order: [
        ['name', 'ASC']
      ]
    });

    res.render('items/index', {
      title: 'Daftar Items',
      items: [],
      categories,
      selectedCategory: category || null,
      search: q || '',
      errors: req.flash('errors'),
      error: req.flash('error'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal memuat halaman.');
  }
};

// POST create (non-AJAX)
exports.createItem = async (req, res) => {
  try {
    const {
      name,
      code,
      barcode,
      unit,
      categoryId,
      defaultQty,
      service,
      cost,
      markup,
      salePrice,
      priceChangeAllowed
    } = req.body;

    if (!name || isNaN(cost) || isNaN(markup) || isNaN(salePrice)) {
      req.flash('error', 'Input tidak valid');
      return res.redirect('/items/view');
    }

    await Item.create({
      name,
      code,
      barcode: barcode || null,
      unit,
      categoryId: categoryId || null,
      defaultQty: !!defaultQty,
      service: !!service,
      cost: parseFloat(cost),
      markup: parseFloat(markup),
      salePrice: parseFloat(salePrice),
      priceChangeAllowed: !!priceChangeAllowed,
    });

    res.redirect('/items/view');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal membuat item');
    res.redirect('/items/view');
  }
};

exports.getItemJson = async (req, res) => {
  try {
    const {
      offset = 0, limit = 25, category, q
    } = req.query;
    const where = {};

    if (category) {
      where.categoryId = category;
    }

    if (q) {
      where[Op.or] = [{
          name: {
            [Op.like]: `%${q}%`
          }
        },
        {
          code: {
            [Op.like]: `%${q}%`
          }
        },
        {
          barcode: {
            [Op.like]: `%${q}%`
          }
        }
      ];
    }

    const items = await Item.findAll({
      where,
      include: [{
        model: Category,
        as: 'category'
      }], // kamu pakai alias 'category', jaga konsistensinya
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [
        ['name', 'ASC']
      ]
    });

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Gagal memuat item.'
    });
  }
};

// Tambah stok
exports.addStock = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({
      message: 'Item tidak ditemukan'
    });

    item.stock += parseInt(req.body.stock);
    await item.save();
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Gagal menambah stok'
    });
  }
};

// Semua item
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.findAll({
      include: 'category'
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Gagal memuat item'
    });
  }
};

// Update (opsional - AJAX)
exports.updateItem = async (req, res) => {
  const {
    name,
    price,
    categoryId
  } = req.body;
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({
      message: 'Item tidak ditemukan'
    });

    item.name = name;
    item.price = price;
    item.categoryId = categoryId || null;
    await item.save();
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Gagal mengupdate item'
    });
  }
};

// Delete (opsional - AJAX)
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({
      message: 'Item tidak ditemukan'
    });

    await item.destroy();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Gagal menghapus item'
    });
  }
};
