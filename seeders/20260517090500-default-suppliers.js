'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.bulkInsert('Suppliers', [{
                code: 'SUP001',
                name: 'PT Sumber ATK Nusantara',
                phone: '081234567890',
                email: 'atk@supplier.com',
                address: 'Jl. Raya Industri No. 10',
                city: 'Surabaya',
                postalCode: '60123',
                country: 'Indonesia',
                note: 'Supplier alat tulis kantor',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                code: 'SUP002',
                name: 'CV Digital Printing Jaya',
                phone: '081298765432',
                email: 'printing@supplier.com',
                address: 'Jl. Percetakan No. 25',
                city: 'Malang',
                postalCode: '65145',
                country: 'Indonesia',
                note: 'Supplier bahan cetak dan printing',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                code: 'SUP003',
                name: 'PT Voucher Teknologi Indonesia',
                phone: '082112223333',
                email: 'voucher@supplier.com',
                address: 'Jl. Teknologi No. 88',
                city: 'Jakarta',
                postalCode: '10110',
                country: 'Indonesia',
                note: 'Supplier voucher dan PPOB',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('Suppliers', {
            code: ['SUP001', 'SUP002', 'SUP003']
        });
    }
};