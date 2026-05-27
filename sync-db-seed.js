// sync-db-seed.js

const db = require('./app/models');

// Import seeder
const customerSeeder = require('./seeders/20260517090419-default-customer');
const supplierSeeder = require('./seeders/20260517090500-default-suppliers');
const categorySeeder = require('./seeders/20260517090600-default-categories');
const productsSeeder = require('./seeders/20260517090700-demo-products');
const userSeeder = require('./seeders/20260527120000-default-users');

async function exists(tableName, where) {
    const count = await db.sequelize.getQueryInterface().rawSelect(tableName, {
        where
    }, ['id']);

    return Boolean(count);
}

async function runSeederOnce(label, tableName, where, seeder, queryInterface) {
    if (await exists(tableName, where)) {
        console.log(`⏭️  ${label} seeder skipped (data already exists)`);
        return;
    }

    console.log(`⏳ Running ${label} seeder...`);
    await seeder.up(queryInterface, db.Sequelize);
    console.log(`✅ ${label} seeder done`);
}

async function setupDatabase() {
    try {

        console.log('⏳ Syncing database...');

        // Create tables by default. Use DB_SYNC_ALTER=true only when intentionally changing schema.
        await db.sequelize.sync({
            alter: process.env.DB_SYNC_ALTER === 'true'
        });

        console.log('✅ Database synced');

        const queryInterface = db.sequelize.getQueryInterface();

        await runSeederOnce('user', 'Users', { username: 'admin' }, userSeeder, queryInterface);
        await runSeederOnce('customer', 'Customers', { name: 'Walk-in Customer' }, customerSeeder, queryInterface);
        await runSeederOnce('supplier', 'Suppliers', { code: 'SUP001' }, supplierSeeder, queryInterface);
        await runSeederOnce('category', 'Categories', { prefix: 'ATK' }, categorySeeder, queryInterface);
        await runSeederOnce('products', 'Products', { code: 'ATK-001' }, productsSeeder, queryInterface);

        console.log('\n🎉 Database setup completed');

        process.exit(0);

    } catch (error) {

        console.error('\n❌ Setup failed');
        console.error(error);

        process.exit(1);
    }
}

setupDatabase();
