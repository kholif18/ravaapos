// sync-db-seed.js

const db = require('./app/models');

// Import seeder
const customerSeeder = require('./seeders/20260517090419-default-customer');
const supplierSeeder = require('./seeders/20260517090500-default-suppliers');
const categorySeeder = require('./seeders/20260517090600-default-categories');

async function setupDatabase() {
    try {

        console.log('⏳ Syncing database...');

        // Create/update tables
        await db.sequelize.sync({
            alter: true
        });

        console.log('✅ Database synced');

        const queryInterface = db.sequelize.getQueryInterface();

        console.log('⏳ Running customer seeder...');
        await customerSeeder.up(queryInterface, db.Sequelize);
        console.log('✅ Customer seeder done');

        console.log('⏳ Running supplier seeder...');
        await supplierSeeder.up(queryInterface, db.Sequelize);
        console.log('✅ Supplier seeder done');

        console.log('⏳ Running category seeder...');
        await categorySeeder.up(queryInterface, db.Sequelize);
        console.log('✅ Category seeder done');

        console.log('\n🎉 Database setup completed');

        process.exit(0);

    } catch (error) {

        console.error('\n❌ Setup failed');
        console.error(error);

        process.exit(1);
    }
}

setupDatabase();