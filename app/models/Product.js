module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    name: {
      type: DataTypes.STRING,
      unique: true
    },
    code: {
      type: DataTypes.STRING,
      unique: true
    },
    barcode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    unit: DataTypes.STRING,
    defaultQty: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    service: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    type: {
      type: DataTypes.ENUM('fisik', 'ppob'),
      allowNull: false,
      defaultValue: 'fisik'
    },
    cost: DataTypes.FLOAT,
    markup: DataTypes.FLOAT,
    salePrice: DataTypes.FLOAT,
    priceChangeAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reorderPoint: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    preferredQty: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lowStockWarning: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    enableInputTax: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    tax: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    enableAltDesc: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  Product.associate = models => {
    Product.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });

    Product.belongsTo(models.Supplier, {
      foreignKey: 'supplierId',
      as: 'supplier'
    });

    Product.hasMany(models.StockHistory, {
      foreignKey: 'productId',
      as: 'histories'
    });

    Product.hasMany(models.PurchasingItem, {
      foreignKey: 'productId'
    });
  };

  return Product;
};
