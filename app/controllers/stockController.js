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
