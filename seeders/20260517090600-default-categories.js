'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('Categories', [{
                name: 'ATK',
                prefix: 'ATK',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Cetak',
                prefix: 'CT',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Desain Grafis',
                prefix: 'DG',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Voucher',
                prefix: 'VC',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'PPOB',
                prefix: 'PP',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('Categories', {
            prefix: ['ATK', 'CT', 'DG', 'VC', 'PP']
        });
    }
};