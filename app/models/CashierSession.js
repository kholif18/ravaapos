// models/CashierSession.js
module.exports = (sequelize, DataTypes) => {
    const CashierSession = sequelize.define('CashierSession', {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        openingTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        closingTime: {
            type: DataTypes.DATE,
            allowNull: true
        },
        openingBalance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        closingBalance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true
        },
        expectedBalance: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true
        },
        totalSales: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        totalCashSales: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        difference: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('open', 'closed'),
            defaultValue: 'open'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    });

    CashierSession.associate = models => {
        CashierSession.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
        CashierSession.hasMany(models.Sale, {
            foreignKey: 'sessionId',
            as: 'sales'
        });
    };

    return CashierSession;
};
