// models/Promo.js
module.exports = (sequelize, DataTypes) => {
    const Promo = sequelize.define('Promo', {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        code: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },

        type: {
            type: DataTypes.ENUM('percent', 'fixed'),
            allowNull: false,
            defaultValue: 'percent'
        },

        value: {
            type: DataTypes.FLOAT,
            allowNull: false
        },

        minTransaction: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },

        maxDiscount: {
            type: DataTypes.FLOAT,
            allowNull: true
        },

        usageLimit: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        usedCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        startDate: {
            type: DataTypes.DATE,
            allowNull: true
        },

        expiredAt: {
            type: DataTypes.DATE,
            allowNull: true
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        applyType: {
            type: DataTypes.ENUM('all', 'category', 'product'),
            defaultValue: 'all',
            allowNull: false
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Categories',
                key: 'id'
            }
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Products',
                key: 'id'
            }
        }
    });

    Promo.associate = models => {
        Promo.belongsTo(models.Category, {
            foreignKey: 'categoryId',
            as: 'category'
        });
        Promo.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
        Promo.hasMany(models.Sale, {
            foreignKey: 'promoId',
            as: 'sales'
        });
    };

    return Promo;
};