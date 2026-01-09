require('dotenv').config();
const { pool } = require('./config/database');

async function findClienteSiigo() {
    try {
        const [rows] = await pool.execute(`
      SELECT id, name, identification, document_type, commercial_name
      FROM customers
      WHERE name LIKE '%Cliente SIIGO%' OR name LIKE '%cliente siigo%'
      ORDER BY identification ASC
    `);

        console.log(`✅ Se encontraron ${rows.length} clientes con nombre similar a 'Cliente SIIGO':`);
        console.table(rows);

        // Output just the NITs for copy-pasting convenience
        if (rows.length > 0) {
            const nitList = rows.map(r => r.identification).join(', ');
            console.log('\n--- LISTA DE NITS ---');
            console.log(nitList);
            require('fs').writeFileSync('debug_output.txt', nitList);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

findClienteSiigo();
