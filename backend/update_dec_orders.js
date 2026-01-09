const { query } = require('./config/database');

async function updateDecemberOrders() {
    try {
        console.log('📦 Updating December 2025 orders to "gestion_especial"...');

        const result = await query(`
            UPDATE orders 
            SET status = 'gestion_especial' 
            WHERE created_at BETWEEN '2025-12-01 00:00:00' AND '2025-12-31 23:59:59'
        `);

        console.log(`✅ Successfully updated ${result.affectedRows} orders.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating orders:', error);
        process.exit(1);
    }
}

updateDecemberOrders();
