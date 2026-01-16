const { pool } = require("./config/database");
const siigoService = require("./services/siigoService");
const axios = require("axios");
require("dotenv").config();

async function run() {
    console.log("🚀 Iniciando reparación masiva de productos 'Kilo'...");

    try {
        // 1. Obtener lista de productos "sucios"
        const [products] = await pool.execute("SELECT id, product_name, siigo_id, internal_code FROM products WHERE product_name LIKE '%kilo%' OR product_name LIKE '% kg%' OR product_name LIKE '%kg'");
        console.log(`📋 Encontrados ${products.length} productos con 'kilo' o 'kg' para verificar.`);

        if (products.length === 0) {
            console.log("✅ No hay productos pendientes.");
            process.exit(0);
        }

        // 2. Preparar conexión SIIGO
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        let updatedCount = 0;
        let errors = 0;

        // 3. Iterar y actualizar
        for (const p of products) {
            if (!p.siigo_id) {
                console.log(`⚠️  Saltando ${p.internal_code} (Sin ID de Siigo)`);
                continue;
            }

            process.stdout.write(`🔄 Procesando ${p.internal_code} (${p.product_name.substring(0, 20)}...): `);

            try {
                // Consultar API SIIGO
                const res = await axios.get(`${baseURL}/v1/products/${p.siigo_id}`, { headers, timeout: 10000 });
                const siigoData = res.data;

                // Comparar nombres
                if (siigoData.name !== p.product_name) {
                    // ACTUALIZAR DB LOCAL
                    await pool.execute(
                        "UPDATE products SET product_name = ?, internal_code = ?, updated_at = NOW(), last_sync_at = NOW() WHERE id = ?",
                        [siigoData.name, siigoData.code, p.id]
                    );
                    console.log(`✅ ACTUALIZADO -> ${siigoData.name}`);
                    updatedCount++;
                } else {
                    console.log(`⏹️  Sin cambios (El nombre ya coincide o Siigo no ha cambiado)`);
                }

            } catch (error) {
                console.log(`❌ ERROR: ${error.message}`);
                errors++;
            }

            // Pausa anti-bloqueo (muy importante hoy)
            await new Promise(r => setTimeout(r, 500));
        }

        console.log("\n-------------------------------------------");
        console.log(`🏁 Proceso finalizado.`);
        console.log(`✅ Actualizados: ${updatedCount}`);
        console.log(`❌ Errores: ${errors}`);
        console.log(`⏹️  Sin cambios: ${products.length - updatedCount - errors}`);

    } catch (e) {
        console.error("Fatal Error:", e);
    }
    process.exit();
}

run();
