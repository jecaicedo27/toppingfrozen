const { pool } = require('./config/database');

async function updateMezclas() {
    console.log('🚀 Iniciando re-clasificación de MEZCLAS...');

    try {
        // 1. MEZCLAS -> MEZCLAS (Código ME + C)
        // Ejemplo: MEC...
        // Asumimos que todo lo que empiece por ME y tenga C en alguna parte o sea explícito?
        // La imagen dice: Codigo grupo "ME", codigo subgrupo "C".
        // Interpretación: internal_code empieza por ME... y es de tipo "Mezcla líquida base"? 
        // Vamos a ser más genéricos con ME% y ajustar subgrupos específicos.

        // REGLA 1: Granizados (ME + G)
        console.log('❄️ Actualizando GRANIZADOS (ME%...)');
        const [resG] = await pool.execute(`
            UPDATE products 
            SET category = 'MEZCLAS', subcategory = 'GRANIZADOS' 
            WHERE internal_code LIKE 'MEG%' OR internal_code LIKE 'ME G%'
        `);
        console.log(`   - ${resG.changedRows} productos actualizados a MEZCLAS / GRANIZADOS`);

        // REGLA 2: Mezclas (ME + C) -> SUBGRUPO MEZCLAS
        console.log('🥣 Actualizando MEZCLAS (MEC...)');
        const [resC] = await pool.execute(`
            UPDATE products 
            SET category = 'MEZCLAS', subcategory = 'MEZCLAS' 
            WHERE internal_code LIKE 'MEC%'
        `);
        console.log(`   - ${resC.changedRows} productos actualizados a MEZCLAS / MEZCLAS`);

        // REGLA 3: Malteadas (MM... y MMP...)
        // Incluimos MEM (que era la Vainilla 55g suelta)
        console.log('🥤 Actualizando MALTEADAS (MM%...)');
        const [resM] = await pool.execute(`
            UPDATE products 
            SET category = 'MEZCLAS', subcategory = 'MALTEADA' 
            WHERE internal_code LIKE 'MM%' OR internal_code LIKE 'MMP%' OR internal_code LIKE 'MEM%'
        `);
        console.log(`   - ${resM.changedRows} productos actualizados a MEZCLAS / MALTEADA`);

        // REGLA 4: Frappe (MF...)
        console.log('🍧 Actualizando FRAPPE (MF...)');
        const [resF] = await pool.execute(`
            UPDATE products 
            SET category = 'MEZCLAS', subcategory = 'FRAPPE' 
            WHERE internal_code LIKE 'MF%'
        `);
        console.log(`   - ${resF.changedRows} productos actualizados a MEZCLAS / FRAPPE`);

        console.log('✅ Re-clasificación completada.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error actualizando mezclas:', error);
        process.exit(1);
    }
}

updateMezclas();
