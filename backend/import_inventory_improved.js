const xlsx = require('xlsx');
const { pool } = require('./config/database');
const path = require('path');

const filePath = path.join(__dirname, '../clasificacion de inventario mejorado.xlsx');

async function importInventory() {
    console.log(`📦 Leyendo archivo: ${filePath}`);

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📄 Encontradas ${rows.length} filas.`);

        let updatedCount = 0;
        let notFoundCount = 0;

        for (const row of rows) {
            const sku = (row['sku'] || '').trim();
            const grupo = (row['Grupo'] || '').trim();
            const subgrupo = (row['Subgrupo'] || '').trim();

            if (!sku || !grupo) continue;

            // Actualizar producto
            const [result] = await pool.execute(
                `UPDATE products 
                 SET custom_packing_category = ?, 
                     custom_packing_subcategory = ? 
                 WHERE internal_code = ?`,
                [grupo, subgrupo, sku]
            );

            if (result.affectedRows > 0) {
                updatedCount++;
            } else {
                notFoundCount++;
                // console.log(`⚠️ SKU no encontrado en BD: ${sku}`);
            }
        }

        console.log(`✅ Importación completada.`);
        console.log(`🔄 Actualizados: ${updatedCount}`);
        console.log(`⚠️ No encontrados: ${notFoundCount}`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

importInventory();
