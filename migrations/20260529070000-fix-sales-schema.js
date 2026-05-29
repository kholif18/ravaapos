'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Sales');
    
    if (!tableInfo.paymentStatus) {
      await queryInterface.addColumn('Sales', 'paymentStatus', {
        type: Sequelize.ENUM('unpaid', 'partial', 'paid', 'cancelled'),
        defaultValue: 'paid',
        allowNull: false
      });
    }
    
    if (!tableInfo.paidAmount) {
      await queryInterface.addColumn('Sales', 'paidAmount', {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        allowNull: false
      });
    }
    
    if (!tableInfo.remainingAmount) {
      await queryInterface.addColumn('Sales', 'remainingAmount', {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        allowNull: false
      });
    }
    
    if (!tableInfo.dueDate) {
      await queryInterface.addColumn('Sales', 'dueDate', {
        type: Sequelize.DATEONLY,
        allowNull: true
      });
    }

    if (!tableInfo.promoId) {
      await queryInterface.addColumn('Sales', 'promoId', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!tableInfo.promoCode) {
      await queryInterface.addColumn('Sales', 'promoCode', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.promoDiscount) {
      await queryInterface.addColumn('Sales', 'promoDiscount', {
        type: Sequelize.FLOAT,
        defaultValue: 0
      });
    }

    if (!tableInfo.voidReason) {
      await queryInterface.addColumn('Sales', 'voidReason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.voidedBy) {
      await queryInterface.addColumn('Sales', 'voidedBy', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    if (!tableInfo.voidedAt) {
      await queryInterface.addColumn('Sales', 'voidedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    if (!tableInfo.sessionId) {
      await queryInterface.addColumn('Sales', 'sessionId', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Usually we don't remove columns in down if they might contain data, 
    // but for completeness:
    await queryInterface.removeColumn('Sales', 'sessionId');
    await queryInterface.removeColumn('Sales', 'voidedAt');
    await queryInterface.removeColumn('Sales', 'voidedBy');
    await queryInterface.removeColumn('Sales', 'voidReason');
    await queryInterface.removeColumn('Sales', 'promoDiscount');
    await queryInterface.removeColumn('Sales', 'promoCode');
    await queryInterface.removeColumn('Sales', 'promoId');
    await queryInterface.removeColumn('Sales', 'dueDate');
    await queryInterface.removeColumn('Sales', 'remainingAmount');
    await queryInterface.removeColumn('Sales', 'paidAmount');
    await queryInterface.removeColumn('Sales', 'paymentStatus');
  }
};
