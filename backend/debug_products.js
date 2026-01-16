require('dotenv').config();
const { query } = require('./config/database');

async function checkProducts() {
    try {
        const rows = await query(`
            SELECT id, product_name, category, subcategory 
            FROM products 
            WHERE category LIKE '%SALSA%' OR product_name LIKE '%SALSA%'
            ORDER BY product_name
        `);

        console.log('Found products:');
        rows.forEach(p => {
            console.log(`[${p.id}] [${p.category} -> ${p.subcategory}] ${p.product_name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProducts();
