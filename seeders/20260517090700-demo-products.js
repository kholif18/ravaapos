'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Ambil category dari database dengan ID yang benar
        const categories = await queryInterface.sequelize.query(
            `SELECT id, name FROM Categories WHERE name IN ('ATK', 'Cetak', 'Desain Grafis', 'Voucher', 'PPOB')`, {
                type: Sequelize.QueryTypes.SELECT
            }
        );

        // Ambil supplier dari database
        const suppliers = await queryInterface.sequelize.query(
            `SELECT id, name FROM Suppliers`, {
                type: Sequelize.QueryTypes.SELECT
            }
        );

        // Buat mapping
        const categoryMap = {};
        categories.forEach(category => {
            categoryMap[category.name] = category.id;
        });

        const supplierMap = {};
        suppliers.forEach(supplier => {
            if (supplier.name === 'PT Sumber ATK Nusantara') supplierMap['ATK'] = supplier.id;
            if (supplier.name === 'CV Digital Printing Jaya') supplierMap['Cetak'] = supplier.id;
            if (supplier.name === 'PT Voucher Teknologi Indonesia') supplierMap['Voucher'] = supplier.id;
            if (supplier.name === 'CV Karya Digital') supplierMap['Desain Grafis'] = supplier.id;
        });

        return queryInterface.bulkInsert('Products', [
            // =========================
            // ATK
            // =========================
            {
                name: 'Pulpen Pilot G2',
                code: 'ATK-001',
                barcode: '899100000001',
                unit: 'pcs',
                requireQtyInput: false,
                type: 'fisik',
                cost: 2500,
                markup: 20,
                salePrice: 3000,
                priceChangeAllowed: true,
                stock: 100,
                categoryId: categoryMap['ATK'],
                supplierId: supplierMap['ATK'] || null,
                reorderPoint: 20,
                preferredQty: 50,
                lowStockWarning: true,
                lowStockThreshold: 15,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Buku Tulis 38 Lembar',
                code: 'ATK-002',
                barcode: '899100000002',
                unit: 'pcs',
                requireQtyInput: false,
                type: 'fisik',
                cost: 1800,
                markup: 25,
                salePrice: 2500,
                priceChangeAllowed: false,
                stock: 200,
                categoryId: categoryMap['ATK'],
                supplierId: supplierMap['ATK'] || null,
                reorderPoint: 30,
                preferredQty: 100,
                lowStockWarning: true,
                lowStockThreshold: 20,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },

            // =========================
            // CETAK
            // =========================
            {
                name: 'Print Hitam Putih A4',
                code: 'CT-001',
                barcode: null,
                unit: 'lembar',
                requireQtyInput: true,
                type: 'service',
                cost: 200,
                markup: 150,
                salePrice: 500,
                priceChangeAllowed: true,
                stock: 0,
                categoryId: categoryMap['Cetak'],
                supplierId: supplierMap['Cetak'] || null,
                reorderPoint: 0,
                preferredQty: 0,
                lowStockWarning: false,
                lowStockThreshold: null,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Print Warna A4',
                code: 'CT-002',
                barcode: null,
                unit: 'lembar',
                requireQtyInput: true,
                type: 'service',
                cost: 1000,
                markup: 100,
                salePrice: 2000,
                priceChangeAllowed: true,
                stock: 0,
                categoryId: categoryMap['Cetak'],
                supplierId: supplierMap['Cetak'] || null,
                reorderPoint: 0,
                preferredQty: 0,
                lowStockWarning: false,
                lowStockThreshold: null,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },

            // =========================
            // DESAIN GRAFIS
            // =========================
            {
                name: 'Desain Banner',
                code: 'DG-001',
                barcode: null,
                unit: 'pcs',
                requireQtyInput: false,
                type: 'service',
                cost: 20000,
                markup: 150,
                salePrice: 50000,
                priceChangeAllowed: true,
                stock: 0,
                categoryId: categoryMap['Desain Grafis'],
                supplierId: supplierMap['Desain Grafis'] || null,
                reorderPoint: 0,
                preferredQty: 0,
                lowStockWarning: false,
                lowStockThreshold: null,
                enableInputTax: false,
                tax: null,
                enableAltDesc: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Desain Logo',
                code: 'DG-002',
                barcode: null,
                unit: 'pcs',
                requireQtyInput: false,
                type: 'service',
                cost: 50000,
                markup: 100,
                salePrice: 100000,
                priceChangeAllowed: true,
                stock: 0,
                categoryId: categoryMap['Desain Grafis'],
                supplierId: supplierMap['Desain Grafis'] || null,
                reorderPoint: 0,
                preferredQty: 0,
                lowStockWarning: false,
                lowStockThreshold: null,
                enableInputTax: false,
                tax: null,
                enableAltDesc: true,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },

            // =========================
            // VOUCHER
            // =========================
            {
                name: 'Voucher Game 10K',
                code: 'VC-001',
                barcode: '899100000010',
                unit: 'pcs',
                requireQtyInput: false,
                type: 'fisik',
                cost: 9500,
                markup: 5,
                salePrice: 10000,
                priceChangeAllowed: true,
                stock: 500,
                categoryId: categoryMap['Voucher'],
                supplierId: supplierMap['Voucher'] || null,
                reorderPoint: 100,
                preferredQty: 200,
                lowStockWarning: true,
                lowStockThreshold: 50,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Voucher Internet 25K',
                code: 'VC-002',
                barcode: '899100000011',
                unit: 'pcs',
                requireQtyInput: false,
                type: 'fisik',
                cost: 24000,
                markup: 4,
                salePrice: 25000,
                priceChangeAllowed: true,
                stock: 300,
                categoryId: categoryMap['Voucher'],
                supplierId: supplierMap['Voucher'] || null,
                reorderPoint: 50,
                preferredQty: 100,
                lowStockWarning: true,
                lowStockThreshold: 20,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },

            // =========================
            // PPOB (supplierId bisa null karena PPOB)
            // =========================
            {
                name: 'Token PLN 100K',
                code: 'PP-001',
                barcode: null,
                unit: 'trx',
                requireQtyInput: true,
                type: 'ppob',
                cost: 100000,
                markup: 2,
                salePrice: 102000,
                priceChangeAllowed: false,
                stock: 0,
                categoryId: categoryMap['PPOB'],
                supplierId: null,
                reorderPoint: 0,
                preferredQty: 0,
                lowStockWarning: false,
                lowStockThreshold: null,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Top Up E-Wallet 50K',
                code: 'PP-002',
                barcode: null,
                unit: 'trx',
                requireQtyInput: true,
                type: 'ppob',
                cost: 50000,
                markup: 2,
                salePrice: 51000,
                priceChangeAllowed: false,
                stock: 0,
                categoryId: categoryMap['PPOB'],
                supplierId: null,
                reorderPoint: 0,
                preferredQty: 0,
                lowStockWarning: false,
                lowStockThreshold: null,
                enableInputTax: false,
                tax: null,
                enableAltDesc: false,
                image: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.bulkDelete('Products', {
            code: [
                'ATK-001', 'ATK-002',
                'CT-001', 'CT-002',
                'DG-001', 'DG-002',
                'VC-001', 'VC-002',
                'PP-001', 'PP-002'
            ]
        });
    }
};