const { pool } = require('./config/database');

async function checkMalteadas() {
    try {
        console.log('🔍 Buscando Malteadas de 55g...');
        const [rows] = await pool.execute(`
            SELECT id, product_name, internal_code, category, subcategory, available_quantity, is_active 
            FROM products 
            WHERE product_name LIKE '%MALTEADA%' 
            AND (product_name LIKE '%55%' OR product_name LIKE '%55G%')
        `);

        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkMalteadas();
