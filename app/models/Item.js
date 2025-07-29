module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define('Item', {
    name: DataTypes.STRING,
    code: DataTypes.STRING,
    barcode: DataTypes.STRING,
    unit: DataTypes.STRING,
    defaultQty: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    service: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    }
  });

  Item.associate = models => {
    Item.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category'
    });
  };

  return Item;
};
