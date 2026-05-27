'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Users', [
      {
        username: 'admin',
        password: '9cabc423af5eb2aaab27920d4142e7a037a119bd3e6e7c7dac7fa4472f7c8a74d83dcd59680a0dec076b5d70f12fc4395a83b067dcbb1a26b703db14c3049729', // admin123
        name: 'Administrator',
        email: 'admin@ravaapos.com',
        role: 'admin',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        username: 'kasir',
        password: '9cabc423af5eb2aaab27920d4142e7a037a119bd3e6e7c7dac7fa4472f7c8a74d83dcd59680a0dec076b5d70f12fc4395a83b067dcbb1a26b703db14c3049729', // admin123
        name: 'Kasir Toko',
        email: 'kasir@ravaapos.com',
        role: 'kasir',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
