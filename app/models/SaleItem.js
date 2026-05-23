// models/SaleItem.js
module.exports = (sequelize, DataTypes) => {
    const SaleItem = sequelize.define('SaleItem', {
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        qty: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        price: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        tax: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        discount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        notes: {
            type: DataTypes.TEXT
        }
    });

    SaleItem.associate = models => {
        SaleItem.belongsTo(models.Sale, {
            foreignKey: 'saleId',
            as: 'sale'
        });
        SaleItem.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
    };

    return SaleItem;
};