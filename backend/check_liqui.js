const { query } = require('./config/database');

async function checkProducts() {
    try {
        const rows = await query(`
            SELECT product_name, category, subcategory 
            FROM products 
            WHERE product_name LIKE '%Liquipops%' OR product_name LIKE '%Liquimon%'
            ORDER BY category, product_name
        `);

        console.log('\n=== Productos Liquipops y Liquimon ===\n');
        rows.forEach(p => {
            console.log(`[${p.category || 'NULL'}] → [${p.subcategory || 'NULL'}] ${p.product_name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProducts();
