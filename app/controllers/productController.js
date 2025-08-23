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
const iconv = require('iconv-lite');
const csvParser = require('csv-parser');
const {
  Readable
} = require('stream');
const PDFDocument = require('pdfkit-table');

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
      type,
      cost,
      markup,
      salePrice,
      priceChangeAllowed,
      reorderPoint,
      preferredQty,
      lowStockWarning,
      lowStockThreshold,
      enableInputTax,
      enableAltDesc
    } = req.body;

    const isService = toBoolean(service);
    const allowPriceChange = toBoolean(priceChangeAllowed);
    const hasLowStockWarning = toBoolean(lowStockWarning);
    const isEnableInputTax = toBoolean(enableInputTax);
    const isDefaultQty = toBoolean(defaultQty);
    const isEnableAltDesc = toBoolean(enableAltDesc);

    const tax = parseFloat(req.body.tax);
    const errors = {};

    if (!name?.trim()) errors.name = 'Nama harus diisi';
    if (!code?.trim()) errors.code = 'Kode harus diisi';
    if (req.body.tax && (isNaN(tax) || tax < 0 || tax > 100)) {
      errors.tax = 'Pajak harus antara 0 - 100';
    }
    
    if (!['fisik', 'service', 'ppob'].includes(type)) {
      errors.type = 'Jenis produk tidak valid';
    }
    
    let parsedCost = parseFloat(cost);
    let parsedMarkup = parseFloat(markup);
    let parsedSalePrice = parseFloat(salePrice);
    const parsedReorder = parseInt(reorderPoint);
    const parsedPreferredQty = parseInt(preferredQty);
    const parsedLowStockThreshold = parseInt(lowStockThreshold);

    // validasi sesuai type
    if (type === 'fisik') {
      if (isNaN(parsedCost) || parsedCost <= 0) {
        errors.cost = 'Harga modal harus lebih dari 0';
      }
      if (isNaN(parsedMarkup)) {
        errors.markup = 'Markup tidak valid';
      }
      if (isNaN(parsedSalePrice)) {
        errors.salePrice = 'Harga jual tidak valid';
      }
    }

    if (type === 'service') {
      if (isNaN(parsedCost)) parsedCost = 0; // boleh kosong
      if (isNaN(parsedMarkup)) parsedMarkup = 0;
      if (isNaN(parsedSalePrice)) {
        errors.salePrice = 'Harga jual tidak valid';
      }
    }

    if (type === 'ppob') {
      // PPOB harga fleksibel → abaikan validasi cost/markup/salePrice
      parsedCost = 0;
      parsedMarkup = 0;
      parsedSalePrice = 0;
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
      const uploadDir = path.join(__dirname, '../../public/uploads/products');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
          recursive: true
        });
      }

      const ext = path.extname(req.file.originalname);
      const fileName = `product-${Date.now()}${ext}`;
      const targetPath = path.join(uploadDir, fileName);
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
      type,
      cost: parsedCost || 0,
      markup: parsedMarkup || 0,
      salePrice: parsedSalePrice || 0,
      priceChangeAllowed: allowPriceChange,
      supplierId: supplierId || null,
      reorderPoint: parsedReorder || 0,
      preferredQty: parsedPreferredQty || 0,
      lowStockWarning: hasLowStockWarning,
      lowStockThreshold: hasLowStockWarning ? parsedLowStockThreshold : null,
      enableInputTax: isEnableInputTax,
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

// Update (AJAX)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }

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
      enableInputTax,
      enableAltDesc
    } = req.body;

    const tax = parseFloat(req.body.tax);

    // Konversi boolean
    const isService = toBoolean(service);
    const allowPriceChange = toBoolean(priceChangeAllowed);
    const hasLowStockWarning = toBoolean(lowStockWarning);
    const isEnableInputTax = toBoolean(enableInputTax);
    const isDefaultQty = toBoolean(defaultQty);
    const isEnableAltDesc = toBoolean(enableAltDesc);

    // Parsing angka
    let parsedCost = parseFloat(cost);
    let parsedMarkup = parseFloat(markup);
    let parsedSalePrice = parseFloat(salePrice);
    const parsedReorder = parseInt(reorderPoint);
    const parsedPreferredQty = parseInt(preferredQty);
    const parsedLowStockThreshold = parseInt(lowStockThreshold);

    // ⚡ type tidak boleh diubah (ambil dari DB, bukan dari req.body)
    const type = product.type;

    // Validasi
    const errors = {};
    if (!name?.trim()) errors.name = 'Nama harus diisi';
    if (!code?.trim()) errors.code = 'Kode harus diisi';
    if (req.body.tax && (isNaN(tax) || tax < 0 || tax > 100)) {
      errors.tax = 'Pajak harus antara 0 - 100';
    }

    if (type === 'fisik') {
      if (!isService) {
        if (isNaN(parsedCost) || parsedCost <= 0) {
          errors.cost = 'Harga modal harus lebih dari 0';
        }
        if (isNaN(parsedMarkup)) {
          errors.markup = 'Markup tidak valid';
        }
      } else {
        // jasa → cost & markup boleh kosong, fallback ke 0
        if (isNaN(parsedCost)) parsedCost = 0;
        if (isNaN(parsedMarkup)) parsedMarkup = 0;
      }
      if (isNaN(parsedSalePrice)) {
        errors.salePrice = 'Harga jual tidak valid';
      }
    }

    if (type === 'ppob') {
      // PPOB harga fleksibel → abaikan validasi cost/markup/salePrice
      parsedCost = 0;
      parsedMarkup = 0;
      parsedSalePrice = 0;
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

    // Handle gambar baru
    if (req.file) {
      if (product.image) {
        const oldImagePath = path.join(__dirname, '../public', product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      const uploadDir = path.join(__dirname, '../../public/uploads/products');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
          recursive: true
        });
      }
      const ext = path.extname(req.file.originalname);
      const fileName = `product-${Date.now()}${ext}`;
      const targetPath = path.join(uploadDir, fileName);
      fs.writeFileSync(targetPath, req.file.buffer);
      product.image = `/uploads/products/${fileName}`;
    }

    // Update data
    Object.assign(product, {
      name,
      code,
      barcode: barcode?.trim() || null,
      unit,
      categoryId: categoryId || null,
      defaultQty: isDefaultQty,
      service: isService, // toggle jasa / fisik
      cost: parsedCost || 0,
      markup: parsedMarkup || 0,
      salePrice: parsedSalePrice || 0,
      priceChangeAllowed: allowPriceChange,
      supplierId: supplierId || null,
      reorderPoint: parsedReorder || 0,
      preferredQty: parsedPreferredQty || 0,
      lowStockWarning: hasLowStockWarning,
      lowStockThreshold: hasLowStockWarning ? parsedLowStockThreshold : null,
      enableInputTax: isEnableInputTax,
      tax: isNaN(tax) ? null : tax,
      enableAltDesc: isEnableAltDesc
      // ❌ jangan ubah type
    });

    await product.save();

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
      message: 'Gagal mengupdate produk'
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

    // Hapus file gambar jika ada
    if (product.image) {
      const imagePath = path.join(__dirname, '../../public', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Hapus record produk dari database
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

exports.downloadTemplateCSV = (req, res) => {
  const headers = [
    'name',
    'categoryId',
    'code',
    'barcode',
    'unit',
    'supplierId',
    'defaultQty',
    'service',
    'cost',
    'markup',
    'salePrice',
    'priceChangeAllowed',
    'reorderPoint',
    'preferredQty',
    'lowStockWarning',
    'lowStockThreshold',
    'enableAltDesc'
  ];

  // Contoh data satu baris, isi contoh yang valid
  const exampleRow = [
    'Produk Contoh',
    '1',
    'PRD001',
    '1234567890123',
    'pcs',
    '2',
    'true',
    'false',
    '10000',
    '20',
    '12000',
    'true',
    '10',
    '5',
    'true',
    '2',
    'false'
  ];

  const csvContent = headers.join(',') + '\n' + exampleRow.join(',');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="product_import_template.csv"');
  res.send(csvContent);
};

function detectDelimiter(csvString) {
  // Ambil 1-3 baris pertama (atau lebih) untuk analisa delimiter
  const lines = csvString.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 3);
  const delimiters = [',', ';'];

  // Hitung kemunculan delimiter di tiap baris dan jumlahnya dijumlahkan
  const scores = delimiters.map(d => {
    return lines.reduce((sum, line) => sum + (line.split(d).length - 1), 0);
  });

  // Pilih delimiter dengan jumlah kemunculan paling banyak
  const maxScore = Math.max(...scores);
  const maxIndex = scores.indexOf(maxScore);

  return delimiters[maxIndex];
}

exports.importCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'File CSV tidak ditemukan'
    });
  }

  // Decode buffer ke UTF-8 string (ubah 'utf-8' sesuai encoding file jika perlu)
  const csvString = iconv.decode(req.file.buffer, 'utf-8');

  // Deteksi delimiter otomatis
  const delimiter = detectDelimiter(csvString);

  const results = [];
  const errors = [];
  let createdCount = 0;

  const stream = Readable.from(csvString);

  stream
    .pipe(csvParser({
      separator: delimiter,
      skipLines: 0,
      strict: true,
      mapHeaders: ({
        header
      }) => header.trim()
    }))
    .on('data', (row) => {
      // Trim semua nilai supaya bersih
      for (const key in row) {
        if (typeof row[key] === 'string') {
          row[key] = row[key].trim();
        }
      }
      results.push(row);
    })
    .on('end', async () => {
      for (let [index, row] of results.entries()) {
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
        } = row;

        if (!name || !code) {
          errors.push({
            row: index + 2,
            message: 'Kolom name dan code wajib diisi'
          });
          continue;
        }

        const parsedDefaultQty = toBoolean(defaultQty);
        const parsedService = toBoolean(service);
        const parsedCost = parseFloat(cost) || 0;
        const parsedMarkup = parseFloat(markup) || 0;
        const parsedSalePrice = parseFloat(salePrice) || 0;
        const parsedPriceChangeAllowed = toBoolean(priceChangeAllowed);
        const parsedReorderPoint = parseInt(reorderPoint) || 0;
        const parsedPreferredQty = parseInt(preferredQty) || 0;
        const parsedLowStockWarning = toBoolean(lowStockWarning);
        const parsedLowStockThreshold = parsedLowStockWarning ? (parseInt(lowStockThreshold) || 0) : null;
        const parsedEnableAltDesc = toBoolean(enableAltDesc);

        try {
          await Product.create({
            name,
            categoryId: categoryId || null,
            code,
            barcode: barcode || null,
            unit,
            supplierId: supplierId || null,
            defaultQty: parsedDefaultQty,
            service: parsedService,
            cost: parsedCost,
            markup: parsedMarkup,
            salePrice: parsedSalePrice,
            priceChangeAllowed: parsedPriceChangeAllowed,
            reorderPoint: parsedReorderPoint,
            preferredQty: parsedPreferredQty,
            lowStockWarning: parsedLowStockWarning,
            lowStockThreshold: parsedLowStockThreshold,
            enableAltDesc: parsedEnableAltDesc
          });
          createdCount++;
        } catch (err) {
          errors.push({
            row: index + 2,
            message: err.message
          });
        }
      }

      if (errors.length) {
        return res.status(400).json({
          success: false,
          message: `Beberapa baris gagal diimport`,
          errors
        });
      }

      res.json({
        success: true,
        message: `${createdCount} produk berhasil diimport`
      });
    })
    .on('error', (err) => {
      console.error('CSV parsing error:', err);
      res.status(500).json({
        success: false,
        message: 'Gagal memproses file CSV'
      });
    });
};

// Export CSV produk
exports.exportCSV = async (req, res) => {
  try {
    const {
      category,
      supplierId,
      type,
      q
    } = req.query;
    const where = {};

    if (q) {
      where[Op.or] = [{
          code: {
            [Op.like]: `%${q}%`
          }
        },
        {
          name: {
            [Op.like]: `%${q}%`
          }
        },
        {
          barcode: {
            [Op.like]: `%${q}%`
          }
        },
      ];
    }

    if (category) where.categoryId = category;
    if (supplierId) where.supplierId = supplierId;

    if (type === 'product') where.service = false;
    else if (type === 'service') where.service = true;

    const products = await Product.findAll({
      where,
      order: [
        ['name', 'ASC']
      ],
    });

    // Header CSV disesuaikan dengan fields import
    const header = [
      'name',
      'categoryId',
      'code',
      'barcode',
      'unit',
      'supplierId',
      'defaultQty',
      'service',
      'cost',
      'markup',
      'salePrice',
      'priceChangeAllowed',
      'reorderPoint',
      'preferredQty',
      'lowStockWarning',
      'lowStockThreshold',
      'enableAltDesc',
      'tax',
    ];

    let csv = header.join(',') + '\n';

    products.forEach(p => {
      const row = [
        p.name || '',
        p.categoryId || '',
        p.code || '',
        p.barcode || '',
        p.unit || '',
        p.supplierId || '',
        p.defaultQty ? 'true' : 'false',
        p.service ? 'true' : 'false',
        p.cost?.toFixed(2) || '0.00',
        p.markup?.toFixed(2) || '0.00',
        p.salePrice?.toFixed(2) || '0.00',
        p.priceChangeAllowed ? 'true' : 'false',
        p.reorderPoint || '0',
        p.preferredQty || '0',
        p.lowStockWarning ? 'true' : 'false',
        p.lowStockThreshold || '0',
        p.enableAltDesc ? 'true' : 'false',
        p.tax != null ? p.tax : '',
      ];

      const line = row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      csv += line + '\n';
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('products_backup.csv');
    res.send(csv);
  } catch (err) {
    console.error('Gagal ekspor CSV produk:', err);
    res.status(500).send('Gagal mengekspor CSV produk');
  }
};

// Export PDF produk (pakai pdfmake)
exports.exportPDF = async (req, res) => {
  try {
    const {
      category,
      search,
      supplierId,
      type
    } = req.query;

    // Build filter where clause
    const where = {};
    if (search) {
      where[Op.or] = [{
          code: {
            [Op.like]: `%${search}%`
          }
        },
        {
          name: {
            [Op.like]: `%${search}%`
          }
        }
      ];
    }
    if (category) where.categoryId = category;
    if (supplierId) where.supplierId = supplierId;
    if (type) where.service = type === 'service';

    // Fetch products with supplier and category associations
    const products = await Product.findAll({
      where,
      include: [{
          association: 'category',
          attributes: ['name']
        },
        {
          association: 'supplier',
          attributes: ['name']
        }
      ],
      order: [
        ['name', 'ASC']
      ]
    });

    // Siapkan data tabel sesuai kolom html mu
    const tableData = products.map((p, i) => ({
      no: (i + 1).toString(),
      code: p.code || '',
      name: p.name || '',
      unit: p.unit || '',
      cost: p.cost != null ? p.cost.toLocaleString('id-ID', {
        minimumFractionDigits: 2
      }) : '-',
      salePrice: p.salePrice != null ? p.salePrice.toLocaleString('id-ID', {
        minimumFractionDigits: 2
      }) : '-',
      tax: p.tax != null ? p.tax.toString() : '-'
    }));

    // Setup PDF
    const doc = new PDFDocument({
      margin: 20,
      size: 'A4',
      layout: 'portrait'
    });
    res.setHeader('Content-Disposition', 'attachment; filename="product_report.pdf"');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // Title & date
    doc.font('Helvetica-Bold').fontSize(16).text('Product Report', {
      align: 'center'
    });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, {
      align: 'left'
    });
    doc.moveDown(1);

    // Definisi header & kolom dengan style mirip tabel HTML mu
    const table = {
      headers: [{
          label: '#',
          property: 'no',
          width: 30,
          headerColor: '#d9d9d9',
          align: 'center',
          headerAlign: 'center',
          border: true
        },
        {
          label: 'Code',
          property: 'code',
          width: 70,
          headerColor: '#d9d9d9',
          align: 'left',
          border: true
        },
        {
          label: 'Product Name',
          property: 'name',
          width: 200,
          headerColor: '#d9d9d9',
          align: 'left',
          border: true
        },
        {
          label: 'UOM',
          property: 'unit',
          width: 50,
          headerColor: '#d9d9d9',
          align: 'center',
          border: true
        },
        {
          label: 'Cost',
          property: 'cost',
          width: 80,
          headerColor: '#d9d9d9',
          align: 'right',
          border: true
        },
        {
          label: 'Unit Price',
          property: 'salePrice',
          width: 80,
          headerColor: '#d9d9d9',
          align: 'right',
          border: true
        },
        {
          label: 'Tax (%)',
          property: 'tax',
          width: 50,
          headerColor: '#d9d9d9',
          align: 'right',
          border: true
        }
      ],
      datas: tableData,
      options: {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        prepareHeader: () => {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
        },
        prepareRow: (row, i) => {
          doc.font('Helvetica').fontSize(9).fillColor('black');
          // Background striping: baris genap diberi warna background
          if (i % 2 === 0) {
            const y = doc.y - 3;
            doc.save()
              .rect(doc.x, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 20)
              .fill('#f5f5f5')
              .restore();
          }
        },
        padding: 4,
        columnSpacing: 4,
        border: {
          top: '#ccc',
          left: '#ccc',
          bottom: '#ccc',
          right: '#ccc',
          horizontal: '#ccc',
          vertical: '#ccc'
        }
      }
    };

    // Render tabel
    await doc.table(table);

    // Otomatis close stream ke response
    doc.end();

  } catch (err) {
    console.error('Gagal export PDF:', err);
    res.status(500).send('Gagal export PDF');
  }
};

// Print view produk (HTML tabel striped)
exports.printProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [
        ['name', 'ASC']
      ],
      attributes: ['code', 'name', 'unit', 'cost', 'salePrice', 'tax']
    });

    res.render('products/print', {
      date: new Date().toLocaleDateString('id-ID'),
      layout: false,
      tableData: products.map(p => ({
        code: p.code,
        name: p.name,
        unit: p.unit,
        cost: p.cost,
        salePrice: p.salePrice,
        tax: p.tax
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal menampilkan halaman print');
  }
};

exports.searchJSON = async (req, res) => {
  try {
    const supplierId = req.query.supplierId;
    const term = req.query.term?.trim() || '';

    // Jika tidak ada supplierId, return array kosong
    if (!supplierId) {
      return res.json({
        results: []
      });
    }

    // Filter product berdasarkan supplier dan nama
    const where = {
      supplierId,
      service: false,
      type: {
        [Op.ne]: 'ppob'
      }
    };
    if (term) {
      where.name = {
        [Op.like]: `%${term}%`
      };
    }

    const products = await Product.findAll({
      where,
      attributes: ['id', 'name', 'cost'], // cost sebagai harga beli default
      order: [
        ['name', 'ASC']
      ],
      limit: 50 // batasi jumlah product untuk performa
    });

    // Format untuk Select2
    const results = products.map(p => ({
      id: p.id,
      text: p.name,
      price: p.cost
    }));

    res.json({
      results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      results: []
    });
  }
};