const { pool } = require('./config/database');

async function migrateColumns() {
    console.log('🚀 Iniciando migración de columnas de inventario...');

    try {
        // 1. Verificar columnas actuales
        console.log('🔍 Verificando estructura actual...');
        const [columns] = await pool.execute(`SHOW COLUMNS FROM products`);
        const columnNames = columns.map(c => c.Field);

        const hasCategory = columnNames.includes('category');
        const hasCustomCategory = columnNames.includes('custom_packing_category');

        if (!hasCustomCategory) {
            console.error('❌ Error: No se encuentra la columna custom_packing_category. Abortando (¿Ya se migró?).');

            // Check if we already have the simplified structure
            if (hasCategory) {
                // Check if it's the NEW category (maybe checking content could verify, but name is key)
                console.log('⚠️ La columna "category" existe, pero "custom_packing_category" no. Es posible que ya se haya ejecutado la migración.');
            }
            process.exit(0);
        }

        // 2. Eliminar columnas viejas (Si existen)
        if (hasCategory) {
            console.log('🗑️ Eliminando columna antigua (SIIGO) "category"...');
            await pool.execute('ALTER TABLE products DROP COLUMN category');
        }

        if (columnNames.includes('subcategory')) {
            console.log('🗑️ Eliminando columna antigua (SIIGO) "subcategory"...');
            await pool.execute('ALTER TABLE products DROP COLUMN subcategory');
        }

        // 3. Renombrar columnas nuevas
        console.log('✏️ RENAME: custom_packing_category -> category');
        await pool.execute('ALTER TABLE products RENAME COLUMN custom_packing_category TO category');

        console.log('✏️ RENAME: custom_packing_subcategory -> subcategory');
        await pool.execute('ALTER TABLE products RENAME COLUMN custom_packing_subcategory TO subcategory');

        console.log('✅ Migración completada exitosamente.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

migrateColumns();
