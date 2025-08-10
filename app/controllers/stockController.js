const {
    Product,
    Category,
    StockHistory
} = require('../models');
const {
    formatRupiah
} = require('../helpers/format');
const {
    Op
} = require('sequelize');
const {
    calculateProductValues
} = require('../helpers/stockSummary');
const {
    recordStockHistory
} = require('../helpers/recordStockHistory');
const PDFDocument = require('pdfkit-table');

// Util untuk membangun query filter
function buildProductFilters({
    search,
    categoryId,
    filter
}) {
    const where = {};

    if (search) {
        where.name = {
            [Op.like]: `%${search}%`
        };
    }

    if (categoryId) {
        where.categoryId = categoryId;
    }

    if (filter === 'negative') {
        where.stock = {
            [Op.lt]: 0
        };
    } else if (filter === 'zero') {
        where.stock = 0;
    } else if (filter === 'nonzero') {
        where.stock = {
            [Op.gt]: 0
        };
    }

    return where;
}

// GET /stock → Halaman utama stok
exports.index = async (req, res) => {
    try {
        const categories = await Category.findAll({
            include: {
                model: Product,
                as: 'products',
            },
            order: [
                ['name', 'ASC']
            ],
        });

        const rawProducts = await Product.findAll({
            include: {
                model: Category,
                as: 'category',
            },
            order: [
                ['name', 'ASC']
            ],
        });

        const {
            products,
            totalCost,
            totalSale
        } = calculateProductValues(rawProducts);

        res.render('stock/index', {
            title: 'Stock',
            categories,
            products,
            activePage: 'stock',
            totalCost,
            totalSale,
            formatRupiah,
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            title: 'Error',
            activePage: 'stock',
            message: 'Gagal memuat data stok',
            error: err,
        });
    }
};

// GET /stock/partial → Partial tbody untuk infinite scroll & reload
exports.getPartial = async (req, res) => {
    try {
        const {
            page = 1,
                categoryId,
                search,
                filter,
                id,
        } = req.query;

        const limit = 20;
        const offset = (page - 1) * limit;

        const where = id ?
            {
                id
            } :
            buildProductFilters({
                search,
                categoryId,
                filter
            });

        const rawProducts = await Product.findAll({
            where,
            include: {
                model: Category,
                as: 'category',
            },
            order: [
                ['name', 'ASC']
            ],
            ...(id ? {} : {
                limit,
                offset
            }),
        });

        const {
            products,
            totalCost,
            totalSale
        } = calculateProductValues(rawProducts);

        res.render('stock/_tbody', {
            products,
            formatRupiah,
            totalCost,
            totalSale,
            layout: false,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal mengambil data produk');
    }
};

exports.getSummary = async (req, res) => {
    try {
        const {
            categoryId,
            search
        } = req.query;

        const baseFilter = buildProductFilters({
            categoryId,
            search
        });

        const [negative, zero, positive] = await Promise.all([
            Product.count({
                where: {
                    ...baseFilter,
                    stock: {
                        [Op.lt]: 0
                    }
                }
            }),
            Product.count({
                where: {
                    ...baseFilter,
                    stock: 0
                }
            }),
            Product.count({
                where: {
                    ...baseFilter,
                    stock: {
                        [Op.gt]: 0
                    }
                }
            }),
        ]);

        res.json({
            negative,
            zero,
            positive
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Gagal menghitung ringkasan stok'
        });
    }
};

// POST /stock/:id/add-stock → Tambah stok cepat
exports.addStock = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan',
            });
        }

        // Cegah tambah stok jika tipe jasa
        if (product.service) {
            return res.status(400).json({
                success: false,
                message: 'Produk jasa tidak bisa memiliki stok',
            });
        }

        const qty = parseFloat(req.body.qty);
        if (isNaN(qty)) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah tidak valid',
            });
        }

        // Tambah ke stok sekarang
        product.stock += qty;
        await product.save();

        // Simpan riwayat perubahan stok
        await recordStockHistory({
            productId: product.id,
            type: 'add', // jenis perubahan
            qty, // jumlah yang ditambahkan
            note: req.body.note || '', // catatan opsional dari form
            createdBy: 'admin' // nanti bisa diganti ke user login
        });

        res.json({
            success: true,
            message: 'Stok berhasil ditambahkan',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan stok',
        });
    }
};

exports.adjustStock = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }

        if (product.service) {
            return res.status(400).json({
                success: false,
                message: 'Jasa tidak memiliki stok'
            });
        }

        const newQty = parseFloat(req.body.qty);
        if (isNaN(newQty)) {
            return res.status(400).json({
                success: false,
                message: 'Jumlah tidak valid'
            });
        }

        const diff = newQty - product.stock;
        const oldQty = product.stock;
        product.stock = newQty;
        await product.save();

        await recordStockHistory({
            productId: product.id,
            type: 'adjust',
            qty: diff,
            note: req.body.note || `Stock opname: ${oldQty} → ${newQty}`,
            createdBy: 'admin'
        });

        res.json({
            success: true,
            message: 'Stock berhasil disesuaikan'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal melakukan stock opname'
        });
    }
};

exports.historyPage = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).render('error', {
                title: 'Produk Tidak Ditemukan',
                message: 'Produk tidak ditemukan',
                activePage: 'stock'
            });
        }

        const history = await StockHistory.findAll({
            where: {
                productId: req.params.id
            },
            order: [
                ['createdAt', 'DESC']
            ],
        });

        res.render('stock/history', {
            title: `Riwayat Stok - ${product.name}`,
            product,
            history,
            activePage: 'stock',
            formatRupiah: require('../helpers/format').formatRupiah,
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            title: 'Terjadi Kesalahan',
            message: 'Gagal memuat riwayat stok',
            activePage: 'stock'
        });
    }
};

exports.exportCSV = async (req, res) => {
    try {
        const {
            category,
            search,
            filter
        } = req.query;
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

        let products = await Product.findAll({
            where,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['name']
            }],
            order: [
                ['name', 'ASC']
            ]
        });

        if (filter === 'negative') products = products.filter(p => !p.service && p.stock < 0);
        if (filter === 'zero') products = products.filter(p => p.service || p.stock === 0);
        if (filter === 'nonzero') products = products.filter(p => p.service || p.stock !== 0);

        let csv = 'code,name,category,qty,unit,cost,salePrice,value\n';
        for (const p of products) {
            const qtyCalc = p.service ? 1 : (p.stock ?? 0); // perhitungan value
            const qtyDisplay = p.service ? 0 : (p.stock ?? 0); // ditampilkan di file
            const cost = p.cost ?? 0;
            const salePrice = p.salePrice ?? 0;
            const value = qtyCalc * salePrice;

            const line = [
                p.code,
                p.name,
                p.category?.name || '',
                qtyDisplay,
                p.unit || '',
                cost,
                salePrice,
                value
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');

            csv += line + '\n';
        }

        res.header('Content-Type', 'text/csv');
        res.attachment('stock_export.csv');
        res.send(csv);
    } catch (err) {
        console.error('Gagal ekspor CSV:', err);
        res.status(500).send('Gagal mengekspor CSV');
    }
};

exports.exportPDF = async (req, res) => {
    try {
        const {
            category,
            search,
            filter
        } = req.query;

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

        if (filter === 'negative') {
            where.stock = {
                [Op.lt]: 0
            };
        } else if (filter === 'zero') {
            where.stock = 0;
        } else if (filter === 'nonzero') {
            where.stock = {
                [Op.ne]: 0
            };
        }

        let products = await Product.findAll({
            where,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['name']
            }],
            order: [
                ['name', 'ASC']
            ]
        });

        // Filter
        if (filter === 'negative') products = products.filter(p => !p.service && p.stock < 0);
        if (filter === 'zero') products = products.filter(p => p.service || p.stock === 0);
        if (filter === 'nonzero') products = products.filter(p => p.service || p.stock !== 0);

        // Data & total
        let totalCostPrice = 0;
        let totalCost = 0;
        const tableData = products.map((p, idx) => {
            const qty = p.service ? 0 : (p.stock ?? 0);
            const cost = p.cost ?? 0;
            const total = qty * cost;
            totalCostPrice += cost;
            totalCost += total;
            return [
                (idx + 1).toString(),
                p.code || '',
                p.name || '',
                p.category?.name || '',
                qty.toLocaleString('id-ID'),
                p.unit || '',
                cost.toLocaleString('id-ID', {
                    minimumFractionDigits: 2
                }),
                total.toLocaleString('id-ID', {
                    minimumFractionDigits: 2
                })
            ];
        });

        // PDF setup
        const doc = new PDFDocument({
            margin: 30,
            size: 'A4',
            layout: 'landscape'
        });
        res.setHeader('Content-Disposition', 'attachment; filename="stock_export.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        const colWidths = [30, 70, 200, 100, 50, 50, 100, 100];
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const pageWidth = doc.page.width;
        const startX = (pageWidth - tableWidth) / 2; // center horizontal

        // Judul
        doc.fontSize(16).font('Helvetica-Bold').text('Stock Report', {
            align: 'center'
        });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica')
            .text(`Tanggal: ${new Date().toLocaleString('id-ID')}`, startX, doc.y, {
                width: tableWidth,
                align: 'left'
            });
        doc.moveDown(1);

        const startY = doc.y;

        const drawRow = (row, y, isHeader = false, isStriped = false) => {
            let x = startX;

            // Background
            if (isHeader) {
                doc.save().fillColor('#d9d9d9').rect(startX, y, tableWidth, 20).fill().restore();
                doc.strokeColor('#ccc').lineWidth(0.5)
                    .moveTo(startX, y).lineTo(startX + tableWidth, y).stroke();
            } else if (isStriped) {
                doc.save().fillColor('#f0f0f0').rect(startX, y, tableWidth, 20).fill().restore();
            }

            // Isi cell
            row.forEach((cell, i) => {
                doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(9)
                    .fillColor('black')
                    .text(cell, x + 3, y + 5, {
                        width: colWidths[i] - 6,
                        align: (i >= 4 && i !== 5) ? 'right' : 'left'
                    });

                doc.strokeColor('#ccc').lineWidth(0.5)
                    .moveTo(x, y).lineTo(x, y + 20).stroke();

                x += colWidths[i];
            });

            // Garis vertikal terakhir
            doc.strokeColor('#ccc').lineWidth(0.5)
                .moveTo(x, y).lineTo(x, y + 20).stroke();

            // Garis horizontal bawah
            doc.strokeColor('#ccc').lineWidth(0.5)
                .moveTo(startX, y + 20).lineTo(startX + tableWidth, y + 20).stroke();
        };

        const drawTotalRow = (y, totalCostPrice, totalCost) => {
            let x = startX;

            doc.save().fillColor('#eee').rect(startX, y, tableWidth, 20).fill().restore();

            const totalLabelWidth = colWidths.slice(0, 6).reduce((a, b) => a + b, 0);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('black')
                .text('TOTAL', x + 3, y + 5, {
                    width: totalLabelWidth - 6,
                    align: 'right'
                });

            doc.strokeColor('#ccc').lineWidth(0.5)
                .moveTo(x, y).lineTo(x, y + 20).stroke();
            x += totalLabelWidth;

            doc.text(totalCostPrice.toLocaleString('id-ID', {
                minimumFractionDigits: 2
            }), x + 3, y + 5, {
                width: colWidths[6] - 6,
                align: 'right'
            });
            doc.strokeColor('#ccc').lineWidth(0.5)
                .moveTo(x, y).lineTo(x, y + 20).stroke();
            x += colWidths[6];

            doc.text(totalCost.toLocaleString('id-ID', {
                minimumFractionDigits: 2
            }), x + 3, y + 5, {
                width: colWidths[7] - 6,
                align: 'right'
            });
            doc.strokeColor('#ccc').lineWidth(0.5)
                .moveTo(x, y).lineTo(x, y + 20).stroke();

            doc.moveTo(startX + tableWidth, y).lineTo(startX + tableWidth, y + 20).stroke();
            doc.moveTo(startX, y + 20).lineTo(startX + tableWidth, y + 20).stroke();
        };

        // Gunakan startX dan startY saat menggambar tabel
        drawRow(['#', 'Code', 'Product', 'Category', 'Qty', 'UOM', 'Cost Price', 'Total Cost'], startY, true);
        let y = startY + 20;

        tableData.forEach((row, idx) => {
            drawRow(row, y, false, idx % 2 === 0);
            y += 20;
            if (y > doc.page.height - 80) {
                doc.addPage({
                    size: 'A4',
                    layout: 'landscape'
                });
                y = doc.y;
                drawRow(['#', 'Code', 'Product', 'Category', 'Qty', 'UOM', 'Cost Price', 'Total Cost'], y, true);
                y += 20;
            }
        });

        drawTotalRow(y, totalCostPrice, totalCost);

        doc.end();
    } catch (err) {
        console.error('Gagal export PDF:', err);
        res.status(500).send('Gagal export PDF');
    }
};

exports.printStockReport = async (req, res) => {
    try {
        const {
            category,
            search,
            filter
        } = req.query;

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

        if (filter === 'negative') {
            where.stock = {
                [Op.lt]: 0
            };
        } else if (filter === 'zero') {
            where.stock = 0;
        } else if (filter === 'nonzero') {
            where.stock = {
                [Op.ne]: 0
            };
        }

        let products = await Product.findAll({
            where,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['name']
            }],
            order: [
                ['name', 'ASC']
            ]
        });

        // Filter qty sesuai jenis produk
        if (filter === 'negative') products = products.filter(p => !p.service && p.stock < 0);
        if (filter === 'zero') products = products.filter(p => p.service || p.stock === 0);
        if (filter === 'nonzero') products = products.filter(p => p.service || p.stock !== 0);

        // Hitung total
        let totalCostPrice = 0;
        let totalCost = 0;
        const tableData = products.map((p, idx) => {
            const qty = p.service ? 0 : (p.stock  ?? 0);
            const cost = p.cost  ?? 0;
            const total = qty * cost;
            totalCostPrice += cost;
            totalCost += total;

            return {
                no: idx + 1,
                code: p.code || '',
                name: p.name || '',
                category: p.category?.name || '',
                qty: qty.toLocaleString('id-ID'),
                uom: p.unit || '',
                costPrice: cost.toLocaleString('id-ID', {
                    minimumFractionDigits: 2
                }),
                totalCost: total.toLocaleString('id-ID', {
                    minimumFractionDigits: 2
                })
            };
        });

        res.render('stock/stock_print', {
            date: new Date().toLocaleString('id-ID'),
            tableData,
            layout: false,
            totalCostPrice: totalCostPrice.toLocaleString('id-ID', {
                minimumFractionDigits: 2
            }),
            totalCost: totalCost.toLocaleString('id-ID', {
                minimumFractionDigits: 2
            })
        });

    } catch (err) {
        console.error('Gagal generate print view:', err);
        res.status(500).send('Gagal generate print view');
    }
};
