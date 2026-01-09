const { query } = require('./config/database');

async function checkSiropes() {
    try {
        const rows = await query(`
            SELECT id, product_name, category, subcategory 
            FROM products 
            WHERE product_name LIKE '%sirope%' OR product_name LIKE '%SIROPE%' 
            OR category LIKE '%sirope%' OR category LIKE '%SIROPE%'
            ORDER BY subcategory, product_name
        `);

        console.log(`\n=== SIROPES: Total ${rows.length} productos ===\n`);

        let currentSub = null;
        rows.forEach(p => {
            const cat = p.category || 'NULL';
            const sub = p.subcategory || 'NULL';

            if (sub !== currentSub) {
                console.log(`\n--- SUBCATEGORIA: ${sub} ---`);
                currentSub = sub;
            }
            console.log(`  • ${p.product_name}`);
        });

        // Count by subcategory
        const nullSub = rows.filter(r => !r.subcategory);
        console.log(`\n\n⚠️  Productos SIN subcategoría: ${nullSub.length}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSiropes();
