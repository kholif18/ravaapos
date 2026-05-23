// models/StockMovement.js
module.exports = (sequelize, DataTypes) => {
    const StockMovement = sequelize.define('StockMovement', {
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        qty: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING, // 'sale', 'purchase', 'adjustment', 'void_return'
            allowNull: false
        },
        referenceId: {
            type: DataTypes.INTEGER, // saleId, purchaseId, etc
            allowNull: true
        },
        referenceType: {
            type: DataTypes.STRING, // 'Sale', 'Purchase', etc
            allowNull: true
        },
        beforeStock: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        afterStock: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    });

    StockMovement.associate = models => {
        StockMovement.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
    };

    return StockMovement;
};