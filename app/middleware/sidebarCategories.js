const {
    Category
} = require('../models');

module.exports = async (req, res, next) => {
    try {
        const categories = await Category.findAll({
            order: [
                ['name', 'ASC']
            ]
        });
        res.locals.sidebarCategories = categories;
        next();
    } catch (err) {
        console.error('Gagal mengambil kategori:', err);
        res.locals.sidebarCategories = []; // fallback agar tidak error di EJS
        next();
    }
};
