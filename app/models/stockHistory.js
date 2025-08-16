// models/stockHistory.js
module.exports = (sequelize, DataTypes) => {
    const StockHistory = sequelize.define('StockHistory', {
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        purchasingId: {
            type: DataTypes.INTEGER,
            allowNull: true 
        },
        type: {
            type: DataTypes.ENUM('add', 'adjust', 'purchase', 'sale'),
            allowNull: false
        },
        qty: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        note: {
            type: DataTypes.STRING,
            allowNull: true
        },
        createdBy: {
            type: DataTypes.STRING,
            allowNull: true // Bisa nanti diganti relasi ke user kalau sudah ada// <--- relasi baru
        }
    }, {
        tableName: 'stock_histories',
        timestamps: true
    });

    StockHistory.associate = (models) => {
        StockHistory.belongsTo(models.Product, {
            foreignKey: 'productId',
            as: 'product'
        });
        StockHistory.belongsTo(models.Purchasing, {
            foreignKey: 'purchasingId',
            as: 'purchasing'
        });
    };

    return StockHistory;
};
