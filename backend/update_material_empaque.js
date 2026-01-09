const { pool } = require('./config/database');

async function updateMaterialEmpaque() {
    console.log('🚀 Iniciando re-clasificación de MATERIAL DE EMPAQUE (MA%)...');

    try {
        // Normalizar Categoría Principal
        const categoryName = 'MATERIAL DE EMPAQUE';

        // 1. MAC -> CONTENEDOR
        console.log('📦 Actualizando CONTENEDORES (MAC...)');
        const [resC] = await pool.execute(`
            UPDATE products 
            SET category = ?, subcategory = 'CONTENEDOR' 
            WHERE internal_code LIKE 'MAC%'
        `, [categoryName]);
        console.log(`   - ${resC.changedRows} productos MAC actualizados.`);

        // 2. MAT -> TAPAS
        console.log('⭕ Actualizando TAPAS (MAT...)');
        const [resT] = await pool.execute(`
            UPDATE products 
            SET category = ?, subcategory = 'TAPAS' 
            WHERE internal_code LIKE 'MAT%'
        `, [categoryName]);
        console.log(`   - ${resT.changedRows} productos MAT actualizados.`);

        // 3. MAV -> VASOS
        console.log('🥤 Actualizando VASOS (MAV...)');
        const [resV] = await pool.execute(`
            UPDATE products 
            SET category = ?, subcategory = 'VASOS' 
            WHERE internal_code LIKE 'MAV%'
        `, [categoryName]);
        console.log(`   - ${resV.changedRows} productos MAV actualizados.`);

        // 4. MAP -> PITILLOS
        console.log('🥢 Actualizando PITILLOS (MAP...)');
        const [resP] = await pool.execute(`
            UPDATE products 
            SET category = ?, subcategory = 'PITILLOS' 
            WHERE internal_code LIKE 'MAP%'
        `, [categoryName]);
        console.log(`   - ${resP.changedRows} productos MAP actualizados.`);

        // 5. MAU -> CUCHARA (Utensilios)
        console.log('🥄 Actualizando CUCHARAS (MAU...)');
        const [resU] = await pool.execute(`
            UPDATE products 
            SET category = ?, subcategory = 'CUCHARA' 
            WHERE internal_code LIKE 'MAU%'
        `, [categoryName]);
        console.log(`   - ${resU.changedRows} productos MAU actualizados.`);

        console.log('✅ Re-clasificación de Material de Empaque completada.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error actualizando Material de Empaque:', error);
        process.exit(1);
    }
}

updateMaterialEmpaque();
