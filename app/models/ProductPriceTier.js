module.exports = (sequelize, DataTypes) => {
    const ProductPriceTier = sequelize.define('ProductPriceTier', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        minQty: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 2
            }
        },
        price: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        }
    });

    ProductPriceTier.associate = models => {
        ProductPriceTier.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
    };

    return ProductPriceTier;
};
