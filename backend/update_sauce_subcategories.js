require('dotenv').config();
const { query } = require('./config/database');

async function updateSauceSubcategories() {
    try {
        console.log('🔄 Actualizando subcategorías de salsas...\n');

        // Actualizar Salsas Dulces (Arequipe, Chocolate, Lecherita, Manjar)
        const dulcesResult = await query(`
            UPDATE products 
            SET subcategory = 'Salsas Dulces',
                updated_at = NOW()
            WHERE category LIKE '%SALSA%' 
            AND subcategory IS NULL
            AND (
                product_name LIKE '%AREQUIPE%' OR
                product_name LIKE '%CHOCOLATE%' OR
                product_name LIKE '%LECHERITA%' OR
                product_name LIKE '%MANJAR%' OR
                product_name LIKE '%DULCE%'
            )
        `);
        console.log(`✅ Salsas Dulces actualizadas: ${dulcesResult.affectedRows} productos`);

        // Actualizar Salsa Frutales (Fresa, Mora, Maracuyá, Frutos Rojos, Kiwi)
        const frutalesResult = await query(`
            UPDATE products 
            SET subcategory = 'salsa Frutales',
                updated_at = NOW()
            WHERE category LIKE '%SALSA%' 
            AND subcategory IS NULL
            AND (
                product_name LIKE '%FRESA%' OR
                product_name LIKE '%MORA%' OR
                product_name LIKE '%MARACUYA%' OR
                product_name LIKE '%FRUTOS ROJOS%' OR
                product_name LIKE '%KIWI%'
            )
        `);
        console.log(`✅ salsa Frutales actualizadas: ${frutalesResult.affectedRows} productos`);

        // Actualizar Salsa Picante (Chamoy)
        const picanteResult = await query(`
            UPDATE products 
            SET subcategory = 'Salsa Picante',
                updated_at = NOW()
            WHERE category LIKE '%SALSA%' 
            AND subcategory IS NULL
            AND (
                product_name LIKE '%CHAMOY%' OR
                product_name LIKE '%PICANTE%'
            )
        `);
        console.log(`✅ Salsa Picante actualizadas: ${picanteResult.affectedRows} productos`);

        // Verificar productos que aún tienen NULL
        const remainingNull = await query(`
            SELECT product_name, category, subcategory
            FROM products
            WHERE category LIKE '%SALSA%' AND subcategory IS NULL
        `);

        if (remainingNull.length > 0) {
            console.log(`\n⚠️ Productos que aún están sin subcategoría (${remainingNull.length}):`);
            remainingNull.forEach(p => {
                console.log(`  - ${p.product_name}`);
            });
        } else {
            console.log('\n✨ ¡Todas las salsas tienen subcategoría asignada!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateSauceSubcategories();
