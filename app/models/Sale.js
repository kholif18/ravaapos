// models/Sale.js
module.exports = (sequelize, DataTypes) => {
    const Sale = sequelize.define('Sale', {
        invoiceNumber: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        tax: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        discount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        paymentMethod: {
            type: DataTypes.STRING,
            allowNull: false
        },
        amountReceived: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        change: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        notes: {
            type: DataTypes.TEXT
        },
        cashierId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'paid',
            allowNull: false
        },
        voidReason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        voidedBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        voidedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    });

    Sale.associate = models => {
        Sale.belongsTo(models.Customer, {
            foreignKey: 'customerId',
            as: 'customer'
        });
        Sale.hasMany(models.SaleItem, {
            foreignKey: 'saleId',
            as: 'items'
        });
    };

    return Sale;
};