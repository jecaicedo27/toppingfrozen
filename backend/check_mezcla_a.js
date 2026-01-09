const { query } = require('./config/database');

async function checkMezclaAProducts() {
    try {
        console.log('\n=== Buscando productos "Mezcla A:" en DB local ===\n');

        const localProducts = await query(`
            SELECT product_name, internal_code, category, subcategory 
            FROM products 
            WHERE product_name LIKE 'Mezcla A:%' 
            OR internal_code LIKE 'MEP%' 
            OR internal_code LIKE 'MES%' 
            OR internal_code LIKE 'MET%' 
            OR internal_code LIKE 'MEY%'
            OR internal_code LIKE 'MEV%'
            ORDER BY internal_code
        `);

        console.log(`Productos encontrados en DB local: ${localProducts.length}\n`);

        if (localProducts.length > 0) {
            localProducts.forEach(p => {
                console.log(`  [${p.internal_code}] ${p.product_name}`);
                console.log(`    Categoría: ${p.category || 'NULL'} → Subcategoría: ${p.subcategory || 'NULL'}`);
            });
        } else {
            console.log('  ❌ No se encontraron productos "Mezcla A:" en la DB local');
        }

        // También buscar productos de leche asociados
        console.log('\n\n=== Buscando productos de LECHE (ME1xx/ME0xx) ===\n');

        const milkProducts = await query(`
            SELECT product_name, internal_code, category, subcategory 
            FROM products 
            WHERE internal_code LIKE 'ME1%' OR internal_code LIKE 'ME0%'
            OR product_name LIKE '%Leche en polvo%'
            OR product_name LIKE '%Mezcla B:%'
            ORDER BY internal_code
        `);

        console.log(`Productos de leche encontrados: ${milkProducts.length}\n`);

        if (milkProducts.length > 0) {
            milkProducts.forEach(p => {
                console.log(`  [${p.internal_code || 'NO CODIGO'}] ${p.product_name}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkMezclaAProducts();
