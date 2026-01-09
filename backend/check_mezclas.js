const { query } = require('./config/database');

async function checkMezclas() {
    try {
        // Ver todas las categorías y subcategorías únicas
        const groups = await query(`
            SELECT DISTINCT category, subcategory 
            FROM products 
            WHERE category LIKE '%Mezcla%' OR category LIKE '%MEZCLA%'
            ORDER BY category, subcategory
        `);

        console.log('\n=== GRUPOS DE MEZCLAS ===\n');
        groups.forEach(g => {
            console.log(`[${g.category}] → [${g.subcategory || 'NULL'}]`);
        });

        // Contar productos por grupo
        const all = await query(`
            SELECT product_name, category, subcategory 
            FROM products 
            WHERE category LIKE '%Mezcla%' OR category LIKE '%MEZCLA%'
            ORDER BY category, subcategory, product_name
        `);

        console.log(`\n\nTotal productos de mezclas: ${all.length}\n`);

        // Agrupar por subcategoría
        const bySubcat = {};
        all.forEach(p => {
            const sub = p.subcategory || 'SIN SUBCATEGORIA';
            if (!bySubcat[sub]) bySubcat[sub] = [];
            bySubcat[sub].push(p.product_name);
        });

        console.log('=== PRODUCTOS POR SUBCATEGORÍA ===\n');
        Object.keys(bySubcat).sort().forEach(sub => {
            console.log(`\n${sub} (${bySubcat[sub].length} productos):`);
            bySubcat[sub].slice(0, 5).forEach(name => console.log(`  • ${name}`));
            if (bySubcat[sub].length > 5) {
                console.log(`  ... y ${bySubcat[sub].length - 5} más`);
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMezclas();
