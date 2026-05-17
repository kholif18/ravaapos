// run-seeder.js
const {
    Customer
} = require('./app/models');

async function runSeeder() {
    try {
        // Cek apakah customer sudah ada
        const [customer, created] = await Customer.findOrCreate({
            where: {
                name: 'Walk-in Customer'
            },
            defaults: {
                name: 'Walk-in Customer',
                type: 'umum',
                status: 'active',
                phone: '-',
                email: null,
                memberDiscount: 0,
                point: 0
            }
        });

        if (created) {
            console.log('✅ Default customer created successfully!');
        } else {
            console.log('⚠️ Default customer already exists');
        }

        process.exit();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

runSeeder();