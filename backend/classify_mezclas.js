require('dotenv').config();
const { query } = require('./config/database');

async function classifyMezclas() {
    try {
        console.log('\n🔄 Clasificando productos de Mezclas...\n');

        // 1. Clasificar "Helado Premium" (MEP - Usan ME103/MEL03)
        const premiumResult = await query(`
            UPDATE products 
            SET category = 'Mezclas',
                subcategory = 'Helado Premium',
                updated_at = NOW()
            WHERE internal_code LIKE 'MEP%'
        `);
        console.log(`✅ Helado Premium clasificados: ${premiumResult.affectedRows} productos`);

        // 2. Clasificar "Helado Suave" (MES - Usan ME101/MEL01)
        const suaveResult = await query(`
            UPDATE products 
            SET category = 'Mezclas',
                subcategory = 'Helado Suave',
                updated_at = NOW()
            WHERE internal_code LIKE 'MES%'
        `);
        console.log(`✅ Helado Suave clasificados: ${suaveResult.affectedRows} productos`);

        // 3. Clasificar "Helado Yogurt" (MEY - Usan ME102/MEL02)
        const yogurtResult = await query(`
            UPDATE products 
            SET category = 'Mezclas',
                subcategory = 'Helado Yogurt',
                updated_at = NOW()
            WHERE internal_code LIKE 'MEY%'
        `);
        console.log(`✅ Helado Yogurt clasificados: ${yogurtResult.affectedRows} productos`);

        // 4. Clasificar "Yogur Sin Azucar" (MET - Usan ME106/MEL06 o ME107/MEL07)
        const yogurSinAzucarResult = await query(`
            UPDATE products 
            SET category = 'Mezclas',
                subcategory = 'Yogur Sin Azucar',
                updated_at = NOW()
            WHERE internal_code LIKE 'MET%'
        `);
        console.log(`✅ Yogur Sin Azucar clasificados: ${yogurSinAzucarResult.affectedRows} productos`);

        // 5. Clasificar "Suave Sin Azucar" (MEV - Usan ME107/MEL07)
        const suaveSinAzucarResult = await query(`
            UPDATE products 
            SET category = 'Mezclas',
                subcategory = 'Suave Sin Azucar',
                updated_at = NOW()
            WHERE internal_code LIKE 'MEV%'
        `);
        console.log(`✅ Suave Sin Azucar clasificados: ${suaveSinAzucarResult.affectedRows} productos`);

        // 6. Clasificar productos de Leche (Mezcla B)
        const lecheResult = await query(`
            UPDATE products 
            SET category = 'Leches',
                subcategory = 'Leche en Polvo',
                updated_at = NOW()
            WHERE internal_code LIKE 'MEL%'
        `);
        console.log(`✅ Leches clasificadas: ${lecheResult.affectedRows} productos`);

        // Verificar resultados
        console.log('\n📊 Verificando clasificación...\n');

        const verification = await query(`
            SELECT subcategory, COUNT(*) as total
            FROM products
            WHERE internal_code LIKE 'ME%'
            GROUP BY subcategory
            ORDER BY subcategory
        `);

        verification.forEach(row => {
            console.log(`  ${row.subcategory || 'NULL'}: ${row.total} productos`);
        });

        console.log('\n✨ Clasificación completada!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

classifyMezclas();
