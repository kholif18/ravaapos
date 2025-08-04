const {
    Product
} = require('../models');

exports.index = async (req, res) => {
    try {
        const products = await Product.findAll({
            attributes: ['id', 'name', 'code', 'barcode', 'salePrice'],
            order: [
                ['name', 'ASC']
            ]
        });

        res.render('products/barcode', {
            title: 'Cetak Barcode Produk',
            activePage: 'products',
            products,
            layout: false
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Terjadi kesalahan saat memuat data produk.');
    }
};
