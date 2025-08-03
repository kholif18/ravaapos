module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
        name: DataTypes.STRING,
        prefix: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    });

    Category.associate = models => {
        Category.hasMany(models.Product, {
            foreignKey: 'categoryId',
            as: 'products'
        });
    };

    return Category;
};
