// models/SalePayment.js
module.exports = (sequelize, DataTypes) => {
    const SalePayment = sequelize.define('SalePayment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        saleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Sales',
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        },
        paymentMethod: {
            type: DataTypes.ENUM('cash', 'card', 'qris', 'transfer'),
            allowNull: false,
            defaultValue: 'cash'
        },
        paidAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    }, {
        tableName: 'SalePayments',
        timestamps: true
    });

    SalePayment.associate = models => {
        SalePayment.belongsTo(models.Sale, {
            foreignKey: 'saleId',
            as: 'sale'
        });
        if (models.User) {
            SalePayment.belongsTo(models.User, {
                foreignKey: 'createdBy',
                as: 'creator'
            });
        }
    };

    return SalePayment;
};
