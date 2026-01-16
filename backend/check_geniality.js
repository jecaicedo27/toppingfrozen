const { query } = require('./config/database');

async function checkGeniality() {
    try {
        // Buscar productos Geniality sin categoría o con categoría SIN CLASIFICAR
        const rows = await query(`
            SELECT product_name, category, subcategory 
            FROM products 
            WHERE product_name LIKE '%Geniality%' 
            AND (category IS NULL OR category = '' OR category = 'SIN CLASIFICAR')
            ORDER BY product_name
        `);

        console.log(`\n=== Productos Geniality SIN clasificar: ${rows.length} ===\n`);
        rows.forEach(p => {
            console.log(`[${p.category || 'NULL'}] [${p.subcategory || 'NULL'}] ${p.product_name}`);
        });

        // También buscar todos los Geniality para ver su estado
        const all = await query(`
            SELECT product_name, category, subcategory 
            FROM products 
            WHERE product_name LIKE '%Geniality%' 
            ORDER BY category, subcategory, product_name
        `);

        console.log(`\n\n=== TODOS los productos Geniality: ${all.length} ===\n`);
        all.forEach(p => {
            console.log(`[${p.category || 'NULL'}] → [${p.subcategory || 'NULL'}] ${p.product_name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkGeniality();
