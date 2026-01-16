require('dotenv').config();
const { pool } = require('./config/database');

async function findCustomers() {
    try {
        const [rows] = await pool.execute(`
      SELECT id, name, identification, document_type, commercial_name
      FROM customers
      WHERE (commercial_name IS NULL OR TRIM(commercial_name) = '')
      AND document_type IN ('31', 'NIT')
      ORDER BY name ASC
    `);

        console.log(`✅ Se encontraron ${rows.length} clientes con NIT (Tipo NIT o 31) sin nombre comercial:`);
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

findCustomers();
