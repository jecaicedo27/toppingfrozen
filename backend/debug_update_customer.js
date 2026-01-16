require('dotenv').config();
const { pool } = require('./config/database');

async function updateCustomer() {
    try {
        const identification = '1030547580';
        const newCommercialName = 'Bontejeans1';

        console.log(`Updating customer ${identification} setting commercial_name to '${newCommercialName}'...`);

        const [result] = await pool.execute(`
      UPDATE customers 
      SET commercial_name = ? 
      WHERE identification = ?
    `, [newCommercialName, identification]);

        console.log(`✅ Rows matched: ${result.affectedRows}, Changed: ${result.changedRows}`);

        // Verify the change
        const [rows] = await pool.execute(`
        SELECT id, name, commercial_name, identification, document_type 
        FROM customers 
        WHERE identification = ?
    `, [identification]);

        console.log('--- Updated Record ---');
        console.table(rows);

        process.exit(0);
    } catch (e) {
        console.error('❌ Error updating customer:', e);
        process.exit(1);
    }
}

updateCustomer();
