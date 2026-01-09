require('dotenv').config();
const { query } = require('./config/database');

async function updateSiropeSubcategories() {
    try {
        console.log('🔄 Actualizando subcategorías de siropes...\n');

        // 1. Actualizar productos "Geniality" que no tienen subcategoría
        const genialityResult = await query(`
            UPDATE products 
            SET subcategory = 'Sirope Geniality',
                updated_at = NOW()
            WHERE product_name LIKE '%Geniality%' 
            AND subcategory IS NULL
        `);
        console.log(`✅ Sirope Geniality actualizados: ${genialityResult.affectedRows} productos`);

        // 2. Actualizar productos "Cósmico" como Sirope Bubols
        const cosmicoResult = await query(`
            UPDATE products 
            SET subcategory = 'Sirope Bubols',
                updated_at = NOW()
            WHERE (product_name LIKE '%Cosmico%' OR product_name LIKE '%Cósmico%')
            AND subcategory IS NULL
        `);
        console.log(`✅ Sirope Bubols (Cósmico) actualizados: ${cosmicoResult.affectedRows} productos`);

        // 3. Actualizar productos genéricos (Durazno, Fresa, Granadina, Uva) como Sirope Fusion Mix
        const genericResult = await query(`
            UPDATE products 
            SET subcategory = 'Sirope Fusion Mix',
                updated_at = NOW()
            WHERE product_name IN (
                'Sirope de Durazno',
                'Sirope de Fresa',
                'sirope de Granadina',
                'Sirope de Uva'
            )
            AND subcategory IS NULL
        `);
        console.log(`✅ Sirope Fusion Mix (genéricos) actualizados: ${genericResult.affectedRows} productos`);

        // Verificar si quedan productos sin subcategoría
        const remainingNull = await query(`
            SELECT product_name, category, subcategory
            FROM products
            WHERE (product_name LIKE '%sirope%' OR product_name LIKE '%SIROPE%')
            AND subcategory IS NULL
        `);

        if (remainingNull.length > 0) {
            console.log(`\n⚠️ Productos que aún están sin subcategoría (${remainingNull.length}):`);
            remainingNull.forEach(p => {
                console.log(`  - ${p.product_name}`);
            });
        } else {
            console.log('\n✨ ¡Todos los siropes tienen subcategoría asignada!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateSiropeSubcategories();
