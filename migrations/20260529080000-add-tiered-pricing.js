'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ProductPriceTiers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      minQty: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Remove requireQtyInput from Products
    await queryInterface.removeColumn('Products', 'requireQtyInput');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ProductPriceTiers');
    await queryInterface.addColumn('Products', 'requireQtyInput', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  }
};
