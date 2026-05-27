'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.bulkInsert('Customers', [{
          name: 'Walk-in Customer',
          type: 'umum',
          status: 'active',
          phone: '-',
          email: null,
          address: null,
          memberDiscount: 0,
          point: 0,
          debt_limit: 5000000,
          total_debt: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Bondan',
          type: 'member',
          status: 'active',
          phone: '08123456789',
          email: 'bondan@ravaapos.com',
          address: 'Gedong, Ngluyu',
          memberDiscount: 10,
          point: 0,
          debt_limit: 5000000,
          total_debt: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Stella',
          type: 'umum',
          status: 'active',
          phone: '081987654123',
          email: 'stella@ravaapos.com',
          address: 'Putuk, Ngluyu',
          memberDiscount: 0,
          point: 0,
          debt_limit: 5000000,
          total_debt: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      console.log('Seeder success');
    } catch (err) {
      console.error('Seeder error:', err);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Customers', null, {});
  }
};