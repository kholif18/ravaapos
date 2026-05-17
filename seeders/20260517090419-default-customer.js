'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Customers', [{
      name: 'Walk-in Customer',
      type: 'umum',
      status: 'active',
      phone: '-',
      email: null,
      memberDiscount: 0,
      point: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Customers', {
      name: 'Walk-in Customer'
    });
  }
};
