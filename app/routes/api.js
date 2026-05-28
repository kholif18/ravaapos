// routes/api.js
const express = require('express');
const router = express.Router();
const {
    Product,
    Category
} = require('../models');
const {
    Op
} = require('sequelize');
const reportController = require('../controllers/reportController');

// Search produk
router.get('/products/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const limit = parseInt(req.query.limit) || 20;

        let whereCondition = {};
        if (q && q.length >= 2) {
            whereCondition = {
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
            };
        } else if (q && q.length < 2) {
            // Jika query terlalu pendek, return empty array
            return res.json([]);
        }

        const products = await Product.findAll({
            where: whereCondition,
            attributes: ['id', 'name', 'code', 'barcode', 'salePrice', 'stock'],
            limit: limit,
            order: [
                ['name', 'ASC']
            ]
        });

        res.json(products.map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            barcode: p.barcode,
            salePrice: p.salePrice,
            stock: p.stock
        })));
    } catch (error) {
        console.error('Product search error:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Search kategori
router.get('/categories/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        const limit = parseInt(req.query.limit) || 20;

        let whereCondition = {};
        if (q && q.length >= 2) {
            whereCondition = {
                name: {
                    [Op.like]: `%${q}%`
                }
            };
        } else if (q && q.length < 2) {
            return res.json([]);
        }

        const categories = await Category.findAll({
            where: whereCondition,
            attributes: ['id', 'name'],
            limit: limit,
            order: [
                ['name', 'ASC']
            ]
        });

        res.json(categories);
    } catch (error) {
        console.error('Category search error:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

// Reports API
router.get('/reports/daily', reportController.getDailyReportAPI);
router.get('/reports/x-reading', reportController.getXReadingAPI);

module.exports = router;