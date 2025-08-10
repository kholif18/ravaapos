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
      supplierId,
      type,
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
    const selectedSupplier = supplierId || '';
    const selectedType = type || '';
    const search = q || '';

    res.render('products/index', {
      title: 'Products',
      categories,
      suppliers,
      activePage: 'products',
      selectedCategory,
      selectedSupplier,
      selectedType,
      search
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.generateProductCode = async (req, res) => {
  try {
    const {
      categoryId
    } = req.query;

    if (!categoryId) return res.status(400).json({
      error: 'Kategori tidak valid'
    });

    const category = await Category.findByPk(categoryId);
    if (!category || !category.prefix) {
      return res.status(400).json({
        error: 'Prefix kategori tidak ditemukan'
      });
    }

    const prefix = category.prefix;

    const lastProduct = await Product.findOne({
      where: {
        code: {
          [Op.like]: `${prefix}%`
        }
      },
      order: [
        ['code', 'DESC']
      ]
    });

    let nextCode = `${prefix}0001`;
    if (lastProduct) {
      const match = lastProduct.code.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const number = parseInt(match[1]) + 1;
        nextCode = `${prefix}${number.toString().padStart(4, '0')}`;
      }
    }

    return res.json({
      code: nextCode
    });
  } catch (err) {
    console.error('Gagal generate kode:', err);
    return res.status(500).json({
      error: 'Gagal generate kode'
    });
  }
};

const toBoolean = val => val === 'true' || val === true || val === 'on';

// POST create (AJAX)
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      categoryId,
      code,
      barcode,
      unit,
      supplierId,
      defaultQty,
      service,
      cost,
      markup,
      salePrice,
      priceChangeAllowed,
      reorderPoint,
      preferredQty,
      lowStockWarning,
      lowStockThreshold,
      enableAltDesc
    } = req.body;

    const isService = toBoolean(service);
    const allowPriceChange = toBoolean(priceChangeAllowed);
    const hasLowStockWarning = toBoolean(lowStockWarning);
    const isDefaultQty = toBoolean(defaultQty);
    const isEnableAltDesc = toBoolean(enableAltDesc);

    const tax = parseFloat(req.body.tax);
    const errors = {};

    if (!name?.trim()) errors.name = 'Nama harus diisi';
    if (!code?.trim()) errors.code = 'Kode harus diisi';
    if (req.body.tax && (isNaN(tax) || tax < 0 || tax > 100)) {
      errors.tax = 'Pajak harus antara 0 - 100';
    }

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
      tax: isNaN(tax) ? null : tax,
      enableAltDesc: isEnableAltDesc,
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
      offset = 0, limit = 25, category, supplierId, type, q
    } = req.query;

    const where = {};
    // Filter category
    if (category) where.categoryId = category;

    // Filter supplier
    if (supplierId) where.supplierId = supplierId;

    // Filter tipe produk (produk fisik / jasa)
    if (type === 'product') {
      where.service = false;
    } else if (type === 'service') {
      where.service = true;
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

    const {
      rows: products,
      count
    } = await Product.findAndCountAll({
      where,
      include: [{
        model: Category,
        as: 'category'
      }, {
        model: Supplier,
        as: 'supplier'
      }],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [
        ['name', 'ASC']
      ]
    });

    res.json({
      products,
      total: count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Gagal memuat product.'
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
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({
      success: false,
      message: 'Product tidak ditemukan'
    });

    // Ambil semua field form
    const {
      name,
      categoryId,
      code,
      barcode,
      unit,
      supplierId,
      defaultQty,
      isService,
      cost,
      markup,
      salePrice,
      priceChangeAllowed,
      reorderPoint,
      preferredQty,
      enableLowStockWarning,
      lowStockThreshold,
      enableInputTax,
      tax,
      enableAltDesc
    } = req.body;

    // Parsing & konversi boolean
    const boolDefaultQty = toBoolean(defaultQty);
    const boolIsService = toBoolean(isService);
    const boolPriceChangeAllowed = toBoolean(priceChangeAllowed);
    const boolLowStockWarning = toBoolean(enableLowStockWarning);
    const boolEnableInputTax = toBoolean(enableInputTax);
    const boolEnableAltDesc = toBoolean(enableAltDesc);

    // Parsing number
    const parsedCost = parseFloat(cost);
    const parsedMarkup = parseFloat(markup);
    const parsedSalePrice = parseFloat(salePrice);
    const parsedReorderPoint = parseInt(reorderPoint);
    const parsedPreferredQty = parseInt(preferredQty);
    const parsedLowStockThreshold = parseInt(lowStockThreshold);
    const parsedTax = parseFloat(tax);

    // Validasi sederhana
    const errors = {};
    if (!name?.trim()) errors.name = 'Nama harus diisi';
    if (!code?.trim()) errors.code = 'Kode harus diisi';
    if (req.body.tax && (isNaN(parsedTax) || parsedTax < 0 || parsedTax > 100)) {
      errors.tax = 'Pajak harus antara 0 - 100';
    }
    if (!boolIsService && (isNaN(parsedCost) || parsedCost <= 0)) {
      errors.cost = 'Harga modal harus lebih dari 0';
    }
    if (boolIsService && isNaN(parsedCost)) {
      // untuk service cost bisa 0
    }
    if (!boolIsService && isNaN(parsedMarkup)) {
      errors.markup = 'Markup tidak valid';
    }
    if (isNaN(parsedSalePrice)) {
      errors.salePrice = 'Harga jual tidak valid';
    }
    if (boolLowStockWarning && (isNaN(parsedLowStockThreshold) || parsedLowStockThreshold < 0)) {
      errors.lowStockThreshold = 'Batas stok rendah tidak valid';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // Handle gambar baru (jika ada)
    if (req.file) {
      // Hapus gambar lama jika ada
      if (product.image) {
        const oldImagePath = path.join(__dirname, '../public', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      // Simpan gambar baru
      const ext = path.extname(req.file.originalname);
      const fileName = `product-${Date.now()}${ext}`;
      const targetPath = path.join(__dirname, '../public/uploads/products', fileName);
      fs.writeFileSync(targetPath, req.file.buffer);
      product.image = `/uploads/products/${fileName}`;
    }

    // Update semua field ke product
    product.name = name;
    product.code = code;
    product.barcode = barcode?.trim() || null;
    product.unit = unit;
    product.categoryId = categoryId || null;
    product.defaultQty = boolDefaultQty;
    product.service = boolIsService;
    product.cost = boolIsService ? 0 : parsedCost || 0;
    product.markup = boolIsService ? 0 : parsedMarkup || 0;
    product.salePrice = parsedSalePrice || 0;
    product.priceChangeAllowed = boolPriceChangeAllowed;
    product.supplierId = supplierId || null;
    product.reorderPoint = parsedReorderPoint || 0;
    product.preferredQty = parsedPreferredQty || 0;
    product.lowStockWarning = boolLowStockWarning;
    product.lowStockThreshold = boolLowStockWarning ? parsedLowStockThreshold : null;
    product.enableInputTax = boolEnableInputTax;
    product.tax = boolEnableInputTax && !isNaN(parsedTax) ? parsedTax : null;
    product.enableAltDesc = boolEnableAltDesc;

    await product.save();

    return res.json({
      success: true,
      product
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
      message: 'Gagal mengupdate produk'
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

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
          model: Category,
          as: 'category'
        },
        {
          model: Supplier,
          as: 'supplier'
        }
      ]
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk'
    });
  }
};
