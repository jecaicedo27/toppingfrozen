const xlsx = require('xlsx');
const { pool } = require("./config/database");
require("dotenv").config();

const filePath = '/var/www/toppingfrozen/clasificacion de inventario.xlsx';

async function run() {
    console.log("🚀 Iniciando importación de Categorías desde Excel...");

    try {
        // 1. Leer Excel
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📊 Filas encontradas: ${rows.length}`);

        let updatedCount = 0;
        let notFoundCount = 0;
        let errors = 0;

        for (const row of rows) {
            // Mapeo flexible de nombres de columnas
            // Excel: "Codigo", "Grupo"
            const code = row['Codigo'] || row['Código'] || row['codigo'];
            const category = row['Grupo'] || row['Categoria'] || row['Categoría'];

            if (!code || !category) {
                // console.log("   ⚠️ Fila incompleta:", row);
                continue;
            }

            try {
                // 2. Actualizar DB
                const [result] = await pool.execute(
                    "UPDATE products SET custom_packing_category = ? WHERE internal_code = ?",
                    [category.trim(), code.trim()]
                );

                if (result.affectedRows > 0) {
                    updatedCount++;
                    // console.log(`   ✅ ${code} -> ${category}`);
                } else {
                    notFoundCount++;
                    console.log(`   ❌ Código no encontrado en BD: ${code}`);
                }
            } catch (err) {
                console.log(`   🚨 Error actualizando ${code}: ${err.message}`);
                errors++;
            }
        }

        console.log("\n========================================");
        console.log("🏁 RESUMEN DE IMPORTACIÓN");
        console.log(`   Procesados (Excel): ${rows.length}`);
        console.log(`   Actualizados en BD: ${updatedCount}`);
        console.log(`   No encontrados:     ${notFoundCount}`);
        console.log(`   Errores DB:         ${errors}`);
        console.log("========================================");

    } catch (e) {
        console.error("Fatal Error:", e);
    }
    process.exit();
}

run();
