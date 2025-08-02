const path = require('path');
const fs = require('fs');
const {
  validationResult
} = require('express-validator');
const {
  Product,
  Category,
  Supplier
} = require('../models');
const {
  Op,
  Sequelize
} = require('sequelize');

// GET view
exports.viewProducts = async (req, res) => {
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
    const suppliers = await Supplier.findAll({
      order: [
        ['name', 'ASC']
      ]
    });

    const selectedCategory = category || '';
    const search = q || '';

    res.render('products/index', {
      title: 'Products',
      categories,
      suppliers,
      activePage: 'products',
      selectedCategory,
      search
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

const toBoolean = val => val === 'true' || val === true || val === 'on';

// POST create (AJAX)
exports.createProduct = async (req, res) => {
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
      priceChangeAllowed,
      supplierId,
      reorderPoint,
      preferredQty,
      lowStockWarning,
      lowStockThreshold,
      altDescription
    } = req.body;

    const isService = toBoolean(service);
    const allowPriceChange = toBoolean(priceChangeAllowed);
    const hasLowStockWarning = toBoolean(lowStockWarning);
    const isDefaultQty = toBoolean(defaultQty);

    const errors = {};

    if (!name?.trim()) errors.name = 'Nama harus diisi';
    if (!code?.trim()) errors.code = 'Kode harus diisi';

    let parsedCost = parseFloat(cost);
    let parsedMarkup = parseFloat(markup);
    let parsedSalePrice = parseFloat(salePrice);
    const parsedReorder = parseInt(reorderPoint);
    const parsedPreferredQty = parseInt(preferredQty);
    const parsedLowStockThreshold = parseInt(lowStockThreshold);

    if (!isService && (isNaN(parsedCost) || parsedCost <= 0)) {
      errors.cost = 'Harga modal harus lebih dari 0';
    }

    if (isService && isNaN(parsedCost)) {
      parsedCost = 0;
    }

    if (!isService && isNaN(parsedMarkup)) {
      errors.markup = 'Markup tidak valid';
    }

    if (isNaN(parsedSalePrice)) {
      errors.salePrice = 'Harga jual tidak valid';
    }

    if (hasLowStockWarning && (isNaN(parsedLowStockThreshold) || parsedLowStockThreshold < 0)) {
      errors.lowStockThreshold = 'Batas stok rendah tidak valid';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // Handle gambar
    let imagePath = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const fileName = `product-${Date.now()}${ext}`;
      const targetPath = path.join(__dirname, '../public/uploads/products', fileName);
      fs.writeFileSync(targetPath, req.file.buffer);
      imagePath = `/uploads/products/${fileName}`;
    }

    await Product.create({
      name,
      code,
      barcode: barcode?.trim() || null,
      unit,
      categoryId: categoryId || null,
      defaultQty: isDefaultQty,
      service: isService,
      cost: parsedCost || 0,
      markup: parsedMarkup || 0,
      salePrice: parsedSalePrice || 0,
      priceChangeAllowed: allowPriceChange,
      supplierId: supplierId || null,
      reorderPoint: parsedReorder || 0,
      preferredQty: parsedPreferredQty || 0,
      lowStockWarning: hasLowStockWarning,
      lowStockThreshold: hasLowStockWarning ? parsedLowStockThreshold : null,
      altDescription: altDescription?.trim() || null,
      image: imagePath
    });

    return res.json({
      success: true
    });

  } catch (err) {
    console.error(err);

    if (err instanceof Sequelize.UniqueConstraintError) {
      const errors = {};
      for (const e of err.errors) {
        errors[e.path] = `${e.path} sudah digunakan`;
      }
      return res.status(400).json({
        success: false,
        errors
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal membuat produk'
    });
  }
};

// JSON untuk tabel infinite scroll
exports.getProductJson = async (req, res) => {
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

    const products = await Product.findAll({
      where,
      include: [{
        model: Category,
        as: 'category'
      }],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [
        ['name', 'ASC']
      ]
    });

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Gagal memuat product.'
    });
  }
};

// Tambah stok
exports.addStock = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({
      message: 'Product tidak ditemukan'
    });

    product.stock += parseInt(req.body.stock);
    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Gagal menambah stok'
    });
  }
};

// Semua product (opsional)
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: 'category'
    });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Gagal memuat product'
    });
  }
};

// Update (AJAX)
exports.updateProduct = async (req, res) => {
  const {
    name,
    price,
    categoryId
  } = req.body;
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({
      message: 'Product tidak ditemukan'
    });

    product.name = name;
    product.price = price;
    product.categoryId = categoryId || null;
    await product.save();
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Gagal mengupdate product'
    });
  }
};

// Delete (AJAX)
exports.destroy = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product tidak ditemukan'
      });
    }

    await product.destroy();

    res.json({
      success: true,
      message: 'Product berhasil dihapus'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus product'
    });
  }
};
