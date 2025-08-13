// models/Purchasing.js
module.exports = (sequelize, DataTypes) => {
    const Purchasing = sequelize.define('Purchasing', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        supplierId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        total: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        status: {
            type: DataTypes.ENUM('draft', 'completed', 'cancelled'),
            defaultValue: 'draft'
        }
    }, {
        tableName: 'Purchasings'
    });

    Purchasing.associate = (models) => {
        Purchasing.belongsTo(models.Supplier, {
            foreignKey: 'supplierId'
        });
        Purchasing.hasMany(models.PurchasingItem, {
            foreignKey: 'purchasingId',
            as: 'items'
        });
    };

    return Purchasing;
};
