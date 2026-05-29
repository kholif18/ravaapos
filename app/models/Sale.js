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
            type: DataTypes.ENUM('cash', 'card', 'qris', 'transfer'),
            allowNull: true
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
            type: DataTypes.ENUM('completed', 'void', 'cancelled', 'refunded'),
            defaultValue: 'completed',
            allowNull: false
        },
        paymentStatus: {
            type: DataTypes.ENUM('unpaid', 'partial', 'paid', 'cancelled'),
            defaultValue: 'paid',
            allowNull: false
        },
        paidAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            allowNull: false
        },
        remainingAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            allowNull: false
        },
        dueDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        promoId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        promoCode: {
            type: DataTypes.STRING,
            allowNull: true
        },
        promoDiscount: {
            type: DataTypes.FLOAT,
            defaultValue: 0
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
        },
        sessionId: {
            type: DataTypes.INTEGER,
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
        Sale.belongsTo(models.Promo, {
            foreignKey: 'promoId',
            as: 'promo'
        });
        Sale.hasMany(models.SalePayment, {
            foreignKey: 'saleId',
            as: 'payments'
        });
        Sale.belongsTo(models.User, {
            foreignKey: 'cashierId',
            as: 'cashier'
        });
        Sale.belongsTo(models.User, {
            foreignKey: 'voidedBy',
            as: 'voider'
        });
        Sale.belongsTo(models.CashierSession, {
            foreignKey: 'sessionId',
            as: 'session'
        });
    };

    return Sale;
};
