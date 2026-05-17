const {
    Product,
    Category,
    Customer,
    Supplier
} = require('../models');
const {
    Op
} = require('sequelize');

// GET POS page
exports.index = async (req, res) => {
    try {
        // Produk favorit: produk dengan stok > 0, limit 8
        const whereClause = {
            [Op.or]: [{
                    type: 'fisik',
                    service: false,
                    stock: {
                        [Op.gt]: 0
                    }
                },
                {
                    type: 'fisik',
                    service: true
                },
                {
                    type: 'ppob'
                }
            ]
        };

        // Ambil produk favorit (limit 8 untuk grid)
        const favoriteProducts = await Product.findAll({
            where: whereClause,
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }],
            order: [
                ['stock', 'DESC'], // Stok terbanyak dulu
                ['name', 'ASC']
            ],
            limit: 8 // Hanya 8 produk favorit
        });

        console.log(`📦 Favorite Products: ${favoriteProducts.length}`);

        // Ambil semua kategori untuk filter
        const categories = await Category.findAll({
            order: [
                ['name', 'ASC']
            ],
            attributes: ['id', 'name']
        });

        // Ambil customer untuk dropdown
        let customers = [];
        try {
            if (Customer) {
                let defaultCustomer = await Customer.findOne({
                    where: {
                        name: 'Walk-in Customer'
                    }
                });

                if (!defaultCustomer) {
                    defaultCustomer = await Customer.create({
                        name: 'Walk-in Customer',
                        type: 'umum',
                        status: 'active',
                        phone: '-',
                        memberDiscount: 0,
                        point: 0
                    });
                    console.log('✅ Default customer created');
                }

                customers = await Customer.findAll({
                    where: {
                        status: 'active'
                    },
                    order: [
                        ['name', 'ASC']
                    ],
                    attributes: ['id', 'name', 'phone', 'email', 'type', 'memberDiscount']
                });
                console.log(`👥 Customers found: ${customers.length}`);
            }
        } catch (err) {
            console.error('Error fetching customers:', err.message);
            customers = [];
        }

        res.render('pos/pos', {
            title: 'Point of Sale',
            layout: false,
            activePage: 'pos',
            products: favoriteProducts || [],
            categories: categories || [],
            customers: customers || [],
            taxRate: 11,
            date: new Date().toISOString()
        });

    } catch (err) {
        console.error('❌ Error loading POS:', err);
        res.status(500).send(`
            <h1>Error Loading POS</h1>
            <p>${err.message}</p>
            <pre>${err.stack}</pre>
        `);
    }
};

// API: Search products
exports.searchProducts = async (req, res) => {
    try {
        const {
            q,
            categoryId
        } = req.query;

        const whereClause = {
            [Op.or]: [{
                    type: 'fisik',
                    service: false,
                    stock: {
                        [Op.gt]: 0
                    }
                },
                {
                    type: 'fisik',
                    service: true
                },
                {
                    type: 'ppob'
                }
            ]
        };

        // Search by keyword
        if (q && q.trim()) {
            whereClause[Op.and] = [{
                    [Op.or]: [{
                            type: 'fisik',
                            service: false,
                            stock: {
                                [Op.gt]: 0
                            }
                        },
                        {
                            type: 'fisik',
                            service: true
                        },
                        {
                            type: 'ppob'
                        }
                    ]
                },
                {
                    [Op.or]: [{
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
                    ]
                }
            ];
            delete whereClause[Op.or];
        }

        // Filter by category
        if (categoryId && categoryId !== 'all') {
            whereClause.categoryId = parseInt(categoryId);
        }

        const products = await Product.findAll({
            where: whereClause,
            attributes: ['id', 'name', 'code', 'salePrice', 'stock', 'image', 'unit', 'categoryId', 'type', 'service', 'tax', 'enableInputTax',
                'enableAltDesc', 'priceChangeAllowed'
            ],
            limit: 50,
            order: [
                ['name', 'ASC']
            ]
        });

        console.log(`🔍 Search found ${products.length} products`);

        res.json({
            success: true,
            products: products || []
        });

    } catch (err) {
        console.error('Error searching products:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.getFavoriteProducts = async (req, res) => {
    try {
        const {
            categoryId,
            limit = 8
        } = req.query;

        const whereClause = {
            [Op.or]: [{
                    type: 'fisik',
                    service: false,
                    stock: {
                        [Op.gt]: 0
                    }
                },
                {
                    type: 'fisik',
                    service: true
                },
                {
                    type: 'ppob'
                }
            ]
        };

        if (categoryId && categoryId !== 'all') {
            whereClause.categoryId = parseInt(categoryId);
        }

        const products = await Product.findAll({
            where: whereClause,
            attributes: [
                'id', 'name', 'code', 'salePrice', 'stock', 'image', 'unit',
                'categoryId', 'type', 'service', 'tax',
                'enableInputTax', 'enableAltDesc', 'priceChangeAllowed'
            ],
            order: [
                ['stock', 'DESC'],
                ['name', 'ASC']
            ],
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            products: products || []
        });
    } catch (err) {
        console.error('Error fetching favorite products:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// API: Get product by barcode or code
exports.getProductByBarcode = async (req, res) => {
    try {
        const {
            barcode
        } = req.params;

        if (!barcode) {
            return res.status(400).json({
                success: false,
                message: 'Barcode tidak boleh kosong'
            });
        }

        const product = await Product.findOne({
            where: {
                [Op.or]: [{
                        barcode: barcode
                    },
                    {
                        code: barcode
                    }
                ],
                [Op.or]: [{
                        type: 'fisik',
                        service: false,
                        stock: {
                            [Op.gt]: 0
                        }
                    },
                    {
                        type: 'fisik',
                        service: true
                    },
                    {
                        type: 'ppob'
                    }
                ]
            },
            attributes: ['id', 'name', 'code', 'barcode', 'salePrice', 'stock', 'unit', 'type', 'service', 'tax', 'enableInputTax',
                'enableAltDesc', 'priceChangeAllowed'
            ]
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produk tidak ditemukan'
            });
        }

        // Cek stok hanya untuk produk fisik non-jasa
        if (product.type === 'fisik' && !product.service && product.stock <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Stok produk habis'
            });
        }

        res.json({
            success: true,
            product: product
        });

    } catch (err) {
        console.error('Error finding product by barcode:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// API: Get customer by phone/email/name
exports.searchCustomers = async (req, res) => {
    try {
        const {
            q
        } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                customers: []
            });
        }

        if (!Customer) {
            return res.json({
                customers: []
            });
        }

        const customers = await Customer.findAll({
            where: {
                status: 'active',
                [Op.or]: [{
                        name: {
                            [Op.like]: `%${q}%`
                        }
                    },
                    {
                        phone: {
                            [Op.like]: `%${q}%`
                        }
                    },
                    {
                        email: {
                            [Op.like]: `%${q}%`
                        }
                    }
                ]
            },
            attributes: ['id', 'name', 'phone', 'email', 'type', 'memberDiscount'],
            limit: 10
        });

        res.json({
            customers: customers || []
        });

    } catch (err) {
        console.error('Error searching customers:', err);
        res.status(500).json({
            customers: []
        });
    }
};

// API: Get all customers
exports.getCustomers = async (req, res) => {
    try {
        if (!Customer) {
            return res.json({
                customers: []
            });
        }

        const customers = await Customer.findAll({
            where: {
                status: 'active'
            },
            order: [
                ['name', 'ASC']
            ],
            attributes: ['id', 'name', 'phone', 'email', 'type', 'memberDiscount'],
            limit: 100
        });

        res.json({
            customers: customers || []
        });

    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({
            customers: []
        });
    }
};

// POST: Save transaction
exports.saveTransaction = async (req, res) => {
    try {
        const {
            customerId,
            items,
            subtotal,
            tax,
            discount,
            total,
            paymentMethod,
            amountReceived,
            change,
            notes
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Keranjang belanja kosong'
            });
        }

        // Validasi stok hanya untuk produk fisik non-jasa
        for (const item of items) {
            const product = await Product.findByPk(item.productId);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Produk tidak ditemukan`
                });
            }

            // Cek stok hanya untuk produk fisik yang BUKAN jasa (service = false)
            if (product.type === 'fisik' && !product.service && product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Stok ${product.name} tidak mencukupi (tersedia: ${product.stock})`
                });
            }
        }

        // TODO: Simpan ke database
        const orderNumber = 'INV-' + Date.now();

        console.log('✅ Transaction saved:', {
            orderNumber,
            customerId,
            itemsCount: items.length,
            total,
            paymentMethod
        });

        res.json({
            success: true,
            message: 'Transaksi berhasil',
            orderNumber: orderNumber
        });

    } catch (err) {
        console.error('Error saving transaction:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Debug endpoint
exports.debug = async (req, res) => {
    try {
        const allProducts = await Product.findAll({
            attributes: ['id', 'name', 'type', 'service', 'stock', 'salePrice']
        });

        const fisikProducts = await Product.findAll({
            where: {
                type: 'fisik',
                service: false,
                stock: {
                    [Op.gt]: 0
                }
            }
        });

        const serviceProducts = await Product.findAll({
            where: {
                type: 'fisik',
                service: true
            }
        });

        const ppobProducts = await Product.findAll({
            where: {
                type: 'ppob'
            }
        });

        const customers = await Customer.findAll({
            where: {
                status: 'active'
            },
            attributes: ['id', 'name', 'type', 'phone']
        });

        res.json({
            summary: {
                totalProducts: allProducts.length,
                fisikWithStock: fisikProducts.length,
                serviceProducts: serviceProducts.length,
                ppobProducts: ppobProducts.length
            },
            products: {
                fisik: fisikProducts,
                service: serviceProducts,
                ppob: ppobProducts,
                all: allProducts
            },
            customers: customers
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};