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
  PRODUCT_RULES
} = require('../rules/productRules');
const {
  normalizeProduct
} = require('../rules/productNormalizer');
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
      requireQty,
      priceChange,
      altDesc,
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

    res.render('products/index', {
      title: 'Products',
      categories,
      suppliers,
      activePage: 'products',
      selectedCategory: category || '',
      selectedSupplier: supplierId || '',
      selectedType: type || '',
      selectedRequireQty: requireQty || '',
      selectedPriceChange: priceChange || '',
      selectedAltDesc: altDesc || '',
      search: q || ''
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

function handleNormalizeError(err) {
  if (err.message.startsWith('MIN_SALE_PRICE:')) {
    return err.message.split(':')[1];
  }
  return null;
}

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
            requireQtyInput,
            type,
            priceChangeAllowed,
            enableAltDesc,
            enableInputTax
        } = req.body;

        const errors = {};

        // BASIC VALIDATION
        if (!name?.trim()) errors.name = 'Nama harus diisi';
        if (!code?.trim()) errors.code = 'Kode harus diisi';
        if (!unit?.trim()) errors.unit = 'Unit harus diisi';

        // NORMALIZE (semua logic di sini)
        let normalized;
        try {
            normalized = normalizeProduct(type, req.body);
        } catch (err) {
            if (err.message.startsWith('MIN_SALE_PRICE:')) {
                const minPrice = err.message.split(':')[1];
                errors.salePrice = `Harga jual minimal Rp ${Number(minPrice).toLocaleString('id-ID')}`;
            } else {
                return res.status(400).json({ success: false, message: err.message });
            }
        }

        const {
            cost,
            markup,
            salePrice,
            tax,
            lowStockWarning,
            lowStockThreshold,
            reorderPoint,
            preferredQty,
            stock
        } = normalized;

        if (Object.keys(errors).length) {
            return res.status(400).json({ success: false, errors });
        }

        // IMAGE HANDLING
        let imagePath = null;
        if (req.file) {
            const uploadDir = path.join(__dirname, '../../public/uploads/products');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const ext = path.extname(req.file.originalname);
            const fileName = `product-${Date.now()}${ext}`;
            fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);

            imagePath = `/uploads/products/${fileName}`;
        }

        // CREATE PRODUCT
        await Product.create({
            name: name?.trim(),
            categoryId: categoryId || null,
            code: code?.trim(),
            barcode: barcode?.trim() || null,
            unit: unit?.trim(),
            supplierId: supplierId || null,

            requireQtyInput: requireQtyInput === 'on' || requireQtyInput === true,
            type: type,

            cost: cost,
            markup: markup,
            salePrice: salePrice,

            priceChangeAllowed: priceChangeAllowed === 'on' || priceChangeAllowed === true,

            reorderPoint: reorderPoint,
            preferredQty: preferredQty,
            stock: stock,

            lowStockWarning: lowStockWarning,
            lowStockThreshold: lowStockThreshold,

            enableInputTax: enableInputTax === 'on' || enableInputTax === true,
            tax: tax,

            enableAltDesc: enableAltDesc === 'on' || enableAltDesc === true,

            image: imagePath
        });

        return res.json({ success: true });

    } catch (err) {
        console.error('Error creating product:', err);
        
        // Handle unique constraint errors
        if (err.name === 'SequelizeUniqueConstraintError') {
            const errors = {};
            err.errors.forEach(e => {
                if (e.path === 'name') errors.name = 'Nama produk sudah ada';
                if (e.path === 'code') errors.code = 'Kode produk sudah ada';
                if (e.path === 'barcode') errors.barcode = 'Barcode sudah ada';
            });
            return res.status(400).json({ success: false, errors });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server: ' + err.message 
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

        const type = String(product.type).trim().toLowerCase();
        const rule = PRODUCT_RULES[type];

        if (!rule) {
            return res.status(400).json({
                success: false,
                message: 'Type tidak valid'
            });
        }

        const errors = {};

        // BASIC VALIDATION (SAMA DENGAN CREATE)
        if (!req.body.name?.trim()) errors.name = 'Nama harus diisi';
        if (!req.body.code?.trim()) errors.code = 'Kode harus diisi';
        if (!req.body.unit?.trim()) errors.unit = 'Unit harus diisi';

        let normalized;
        try {
            normalized = normalizeProduct(type, req.body);
        } catch (err) {
            const msg = handleNormalizeError(err);
            if (msg) errors.salePrice = `Minimal ${msg}`;
            else throw err;
        }

        const {
            cost,
            markup,
            salePrice,
            tax,
            lowStockWarning,
            lowStockThreshold,
            reorderPoint,
            preferredQty,
        } = normalized;

        if (
            lowStockWarning &&
            (lowStockThreshold === null || lowStockThreshold < 0)
        ) {
            errors.lowStockThreshold = 'Batas stok rendah tidak valid';
        }

        if (Object.keys(errors).length) {
            return res.status(400).json({ success: false, errors });
        }

        // IMAGE
        if (req.file) {
            if (product.image) {
                const oldPath = path.join(__dirname, '../../public', product.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            const uploadDir = path.join(__dirname, '../../public/uploads/products');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const ext = path.extname(req.file.originalname);
            const fileName = `product-${Date.now()}${ext}`;

            fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
            product.image = `/uploads/products/${fileName}`;
        }

        Object.assign(product, {
            name: req.body.name,
            code: req.body.code,
            barcode: req.body.barcode?.trim() || null,
            unit: req.body.unit,

            categoryId: req.body.categoryId || null,
            supplierId: req.body.supplierId || null,

            requireQtyInput: !!req.body.requireQtyInput,

            cost,
            markup,
            salePrice,

            priceChangeAllowed: !!req.body.priceChangeAllowed,

            reorderPoint: Number(req.body.reorderPoint) || 0,
            preferredQty: Number(req.body.preferredQty) || 0,

            lowStockWarning,
            lowStockThreshold,

            enableInputTax: !!req.body.enableInputTax,
            tax,

            enableAltDesc: !!req.body.enableAltDesc
        });

        await product.save();

        return res.json({ success: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false });
    }
};

// JSON untuk tabel infinite scroll
exports.getProductJson = async (req, res) => {
  try {
    const {
      offset = 0,
        limit = 25,
        category,
        supplierId,
        type,
        requireQty,
        priceChange,
        altDesc,
        q
    } = req.query;

    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 25, 1), 100);
    const allowedTypes = ['fisik', 'service', 'ppob'];
    const search = q?.trim();
    
    const where = {};

    // Filter category
    if (category) where.categoryId = category;

    // Filter supplier
    if (supplierId) where.supplierId = supplierId;

    // Filter type - LANGSUNG pakai value dari query
    if (type && allowedTypes.includes(type)) {
      where.type = type;
    }

    // Filter requireQtyInput
    if (requireQty !== undefined && requireQty !== '') {
      where.requireQtyInput = requireQty === 'true';
    }

    // Filter priceChangeAllowed
    if (priceChange !== undefined && priceChange !== '') {
      where.priceChangeAllowed = priceChange === 'true';
    }

    // Filter enableAltDesc
    if (altDesc !== undefined && altDesc !== '') {
      where.enableAltDesc = altDesc === 'true';
    }

    // Search
    if (search) {
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
        },
        {
          model: Supplier,
          as: 'supplier'
        }
      ],
      offset: parsedOffset,
      limit: parsedLimit,
      order: [
        ['name', 'ASC']
      ]
    });

    res.json({
      products,
      total: count
    });
  } catch (err) {
    console.error('Error in getProductJson:', err);
    res.status(500).json({
      error: 'Gagal memuat product.',
      details: err.message
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

    return res.json({
      success: true,
      product
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
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
    'requireQtyInput',
    'type',
    'cost',
    'markup',
    'salePrice',
    'priceChangeAllowed',
    'reorderPoint',
    'lowStockWarning',
    'lowStockThreshold',
    'enableInputTax',
    'tax',
    'enableAltDesc'
  ];

  const exampleRow = [
    'Produk Contoh',
    '1',
    'PRD001',
    '1234567890123',
    'pcs',
    '2',
    'false',
    'fisik',
    '10000',
    '20',
    '12000',
    'false',
    '10',
    'false',
    '5',
    'false',
    '11',
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

  const csvString = iconv.decode(req.file.buffer, 'utf-8');
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
          requireQtyInput,
          type,
          cost,
          markup,
          salePrice,
          priceChangeAllowed,
          reorderPoint,
          lowStockWarning,
          lowStockThreshold,
          enableInputTax,
          tax,
          enableAltDesc
        } = row;

        if (!name || !code) {
          errors.push({
            row: index + 2,
            message: 'Kolom name dan code wajib diisi'
          });
          continue;
        }

        // Konversi boolean
        const parsedRequireQtyInput = toBoolean(requireQtyInput);
        const parsedPriceChangeAllowed = toBoolean(priceChangeAllowed);
        const parsedLowStockWarning = toBoolean(lowStockWarning);
        const parsedEnableInputTax = toBoolean(enableInputTax);
        const parsedEnableAltDesc = toBoolean(enableAltDesc);

        // Parsing angka
        const parsedCost = parseFloat(cost) || 0;
        const parsedMarkup = parseFloat(markup) || 0;
        const parsedSalePrice = parseFloat(salePrice) || 0;
        const parsedReorderPoint = parseInt(reorderPoint) || 0;
        const parsedLowStockThreshold = parseInt(lowStockThreshold) || 0;
        const parsedTax = parseFloat(tax) || null;

        const productType = type || 'fisik';

        try {
          await Product.create({
            name,
            categoryId: categoryId || null,
            code,
            barcode: barcode || null,
            unit,
            supplierId: supplierId || null,
            requireQtyInput: parsedRequireQtyInput,
            type: productType,
            cost: parsedCost,
            markup: parsedMarkup,
            salePrice: parsedSalePrice,
            priceChangeAllowed: parsedPriceChangeAllowed,
            reorderPoint: parsedReorderPoint,
            lowStockWarning: parsedLowStockWarning,
            lowStockThreshold: parsedLowStockWarning ? parsedLowStockThreshold : null,
            enableInputTax: parsedEnableInputTax,
            tax: parsedTax,
            enableAltDesc: parsedEnableAltDesc,
            stock: 0
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

// Export PDF produk (pakai pdfmake)
exports.exportPDF = async (req, res) => {
  try {
    const {
      category,
      search,
      supplierId,
      type
    } = req.query;

    const where = {};

    if (search && search.trim()) {
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
    if (category && category !== '') where.categoryId = category;
    if (supplierId && supplierId !== '') where.supplierId = supplierId;
    if (type && type !== '') where.type = type;

    const products = await Product.findAll({
      where,
      order: [
        ['name', 'ASC']
      ]
    });

    console.log(`Exporting PDF with ${products.length} products`);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      margin: 30,
      size: 'A4'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="product_report_${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('PRODUCT REPORT', {
      align: 'center'
    });
    doc.fontSize(10).font('Helvetica').text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, {
      align: 'left'
    });
    doc.moveDown();

    // Table header
    const startX = 30;
    let currentY = doc.y;
    const colWidths = {
      no: 30,
      code: 70,
      name: 130,
      unit: 40,
      cost: 70,
      salePrice: 70,
      tax: 40
    };

    // Simpan posisi awal header
    const headerY = currentY;

    // Draw header background
    doc.rect(startX, currentY, doc.page.width - 60, 20).fill('#d9d9d9');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);

    let x = startX;
    doc.text('No', x + 5, currentY + 5, {
      width: colWidths.no,
      align: 'center'
    });
    x += colWidths.no;
    doc.text('Kode', x + 5, currentY + 5, {
      width: colWidths.code,
      align: 'left'
    });
    x += colWidths.code;
    doc.text('Nama Produk', x + 5, currentY + 5, {
      width: colWidths.name,
      align: 'left'
    });
    x += colWidths.name;
    doc.text('Unit', x + 5, currentY + 5, {
      width: colWidths.unit,
      align: 'center'
    });
    x += colWidths.unit;
    doc.text('Cost', x + 5, currentY + 5, {
      width: colWidths.cost,
      align: 'right'
    });
    x += colWidths.cost;
    doc.text('Harga Jual', x + 5, currentY + 5, {
      width: colWidths.salePrice,
      align: 'right'
    });
    x += colWidths.salePrice;
    doc.text('Pajak', x + 5, currentY + 5, {
      width: colWidths.tax,
      align: 'right'
    });

    currentY += 20;

    // Simpan posisi setelah header
    let afterHeaderY = currentY;

    // Draw rows
    for (let i = 0; i < products.length; i++) {
      const p = products[i];

      // Check page break (sisakan ruang untuk footer)
      if (currentY > doc.page.height - 60) {
        // Draw footer di halaman sebelum ganti
        doc.fontSize(8).fillColor('#666666');
        doc.text(`Total Produk: ${products.length} | Dicetak dari Sistem POS`, startX, doc.page.height - 40, {
          align: 'center',
          width: doc.page.width - 60
        });

        // Add new page
        doc.addPage();

        // Reset posisi untuk halaman baru
        currentY = 30;

        // Redraw header di halaman baru
        doc.rect(startX, currentY, doc.page.width - 60, 20).fill('#d9d9d9');
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);

        x = startX;
        doc.text('No', x + 5, currentY + 5, {
          width: colWidths.no,
          align: 'center'
        });
        x += colWidths.no;
        doc.text('Kode', x + 5, currentY + 5, {
          width: colWidths.code,
          align: 'left'
        });
        x += colWidths.code;
        doc.text('Nama Produk', x + 5, currentY + 5, {
          width: colWidths.name,
          align: 'left'
        });
        x += colWidths.name;
        doc.text('Unit', x + 5, currentY + 5, {
          width: colWidths.unit,
          align: 'center'
        });
        x += colWidths.unit;
        doc.text('Cost', x + 5, currentY + 5, {
          width: colWidths.cost,
          align: 'right'
        });
        x += colWidths.cost;
        doc.text('Harga Jual', x + 5, currentY + 5, {
          width: colWidths.salePrice,
          align: 'right'
        });
        x += colWidths.salePrice;
        doc.text('Pajak', x + 5, currentY + 5, {
          width: colWidths.tax,
          align: 'right'
        });

        currentY += 20;
      }

      // Alternating row background
      if (i % 2 === 0) {
        doc.rect(startX, currentY, doc.page.width - 60, 18).fill('#f5f5f5');
        doc.fillColor('#000000');
      }

      doc.font('Helvetica').fontSize(8);

      x = startX;
      doc.text((i + 1).toString(), x + 5, currentY + 5, {
        width: colWidths.no,
        align: 'center'
      });
      x += colWidths.no;
      doc.text(p.code || '-', x + 5, currentY + 5, {
        width: colWidths.code,
        align: 'left'
      });
      x += colWidths.code;
      let name = p.name || '-';
      if (name.length > 25) name = name.substring(0, 22) + '...';
      doc.text(name, x + 5, currentY + 5, {
        width: colWidths.name,
        align: 'left'
      });
      x += colWidths.name;
      doc.text(p.unit || '-', x + 5, currentY + 5, {
        width: colWidths.unit,
        align: 'center'
      });
      x += colWidths.unit;
      doc.text(p.cost ? `Rp ${p.cost.toLocaleString('id-ID')}` : '-', x + 5, currentY + 5, {
        width: colWidths.cost,
        align: 'right'
      });
      x += colWidths.cost;
      doc.text(p.salePrice ? `Rp ${p.salePrice.toLocaleString('id-ID')}` : '-', x + 5, currentY + 5, {
        width: colWidths.salePrice,
        align: 'right'
      });
      x += colWidths.salePrice;
      doc.text(p.tax ? `${p.tax}%` : '-', x + 5, currentY + 5, {
        width: colWidths.tax,
        align: 'right'
      });

      currentY += 18;
    }

    // Draw footer di halaman terakhir
    doc.fontSize(8).fillColor('#666666');
    doc.text(`Total Produk: ${products.length} | Dicetak dari Sistem POS`, startX, doc.page.height - 40, {
      align: 'center',
      width: doc.page.width - 60
    });

    doc.end();

  } catch (err) {
    console.error('Gagal export PDF:', err);
    if (!res.headersSent) {
      res.status(500).send('Gagal export PDF: ' + err.message);
    }
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

    if (!supplierId) {
      return res.json({ results: [] });
    }

    const where = {
      supplierId,
      type: { [Op.ne]: 'ppob' }
    };
    
    if (term) {
      where.name = { [Op.like]: `%${term}%` };
    }

    const products = await Product.findAll({
      where,
      attributes: ['id', 'name', 'cost'],
      order: [['name', 'ASC']],
      limit: 50
    });

    const results = products.map(p => ({
      id: p.id,
      text: p.name,
      price: p.cost
    }));

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ results: [] });
  }
};

// Export CSV
exports.exportCSV = async (req, res) => {
  try {
    const {
      category,
      supplierId,
      type,
      requireQty,
      priceChange,
      altDesc,
      q
    } = req.query;

    const where = {};

    if (q && q.trim()) {
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
        }
      ];
    }

    if (category && category !== '') where.categoryId = category;
    if (supplierId && supplierId !== '') where.supplierId = supplierId;
    if (type && type !== '') where.type = type;
    if (requireQty && requireQty !== '') where.requireQtyInput = requireQty === 'true';
    if (priceChange && priceChange !== '') where.priceChangeAllowed = priceChange === 'true';
    if (altDesc && altDesc !== '') where.enableAltDesc = altDesc === 'true';

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

    // Header simpel seperti print
    const headers = ['No', 'Kode', 'Nama Produk', 'Satuan', 'Tipe', 'Harga Beli', 'Harga Jual', 'Pajak'];

    let csv = headers.join(',') + '\n';

    products.forEach((p, index) => {
      const row = [
        index + 1,
        `"${(p.code || '').replace(/"/g, '""')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.unit || '-').replace(/"/g, '""')}"`,
        p.type || 'fisik',
        p.cost || 0,
        p.salePrice || 0,
        p.tax || 0
      ];
      csv += row.join(',') + '\n';
    });

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`products_${Date.now()}.csv`);
    res.send(csv);

  } catch (err) {
    console.error('Gagal ekspor CSV produk:', err);
    res.status(500).send('Gagal mengekspor CSV produk');
  }
};