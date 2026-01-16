require('dotenv').config();
const { pool } = require('./config/database');

async function findKiloProducts() {
    try {
        const searchTerm = '%kilo%';
        const [rows] = await pool.execute(`
      SELECT product_name, internal_code, is_active 
      FROM products 
      WHERE product_name LIKE ?
      ORDER BY product_name ASC
    `, [searchTerm]);

        console.log(`Found ${rows.length} products with 'kilo' in name:\n`);

        // Format output for readability
        rows.forEach(p => {
            const status = p.is_active ? 'ACTIVO' : 'INACTIVO';
            console.log(`[${status}] Name: ${p.product_name} | Code: ${p.internal_code}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error finding products:', error);
        process.exit(1);
    }
}

findKiloProducts();
