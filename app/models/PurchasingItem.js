// models/PurchasingItem.js
module.exports = (sequelize, DataTypes) => {
    const PurchasingItem = sequelize.define('PurchasingItem', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        purchasingId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        qty: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        price: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        updateCost: { 
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'PurchasingItems'
    });

    PurchasingItem.associate = (models) => {
        PurchasingItem.belongsTo(models.Purchasing, {
            foreignKey: 'purchasingId'
        });
        PurchasingItem.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
    };

    return PurchasingItem;
};
