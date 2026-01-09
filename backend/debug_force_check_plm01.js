const { pool } = require("./config/database");
const siigoService = require("./services/siigoService");
const axios = require("axios");
require("dotenv").config();

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log("🕵️‍♂️ Investigando PLM01 contra viento y marea (Timeouts)...");

    try {
        // 1. Datos Locales
        const [rows] = await pool.execute("SELECT id, product_name, internal_code, siigo_id FROM products WHERE internal_code = 'PLM01'");
        if (rows.length === 0) { console.log("❌ NO existe en BD local"); process.exit(); }

        const local = rows[0];
        console.log(`🏠 LOCAL: [${local.internal_code}] ${local.product_name} (UUID: ${local.siigo_id})`);

        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        let siigoData = null;
        let attempts = 0;

        // 2. Intentar buscar por UUID
        console.log("☁️  Intentando consultar SIIGO por UUID...");
        while (!siigoData && attempts < 5) {
            try {
                attempts++;
                const res = await axios.get(`${baseURL}/v1/products/${local.siigo_id}`, { headers, timeout: 10000 });
                siigoData = res.data;
                console.log("✅ ENCONTRADO POR UUID:");
                console.log(`   Nombre: "${siigoData.name}"`);
                console.log(`   Código: "${siigoData.code}"`);
                console.log(`   Activo: ${siigoData.active}`);
            } catch (e) {
                console.log(`   Attempt ${attempts} failed (UUID): ${e.message}`);
                await sleep(2000 * attempts);
            }
        }

        // 3. Si falló por UUID (o 404), intentar por Código
        if (!siigoData) {
            attempts = 0;
            console.log("☁️  Intentando consultar SIIGO por CÓDIGO (PLM01)...");
            while (!siigoData && attempts < 5) {
                try {
                    attempts++;
                    const res = await axios.get(`${baseURL}/v1/products?code=PLM01`, { headers, timeout: 10000 });
                    if (res.data.results && res.data.results.length > 0) {
                        siigoData = res.data.results[0];
                        console.log("✅ ENCONTRADO POR CÓDIGO:");
                        console.log(`   Nombre: "${siigoData.name}"`);
                        console.log(`   Código: "${siigoData.code}"`);
                        console.log(`   UUID:   "${siigoData.id}"`);
                    } else {
                        console.log("❌ SIIGO respondió pero NO encontró PLM01.");
                        break;
                    }
                } catch (e) {
                    console.log(`   Attempt ${attempts} failed (Code): ${e.message}`);
                    await sleep(2000 * attempts);
                }
            }
        }

        // 4. Conclusión y Reparación Automática (si aplica)
        if (siigoData) {
            if (siigoData.name !== local.product_name) {
                console.log("\n🚨¡DISCREPANCIA DETECTADA!🚨");
                console.log(`   Local: "${local.product_name}"`);
                console.log(`   Siigo: "${siigoData.name}"`);
                console.log("🛠️  Aplicando corrección automática...");

                await pool.execute(
                    "UPDATE products SET product_name = ?, internal_code = ?, siigo_id = ?, siigo_product_id = ?, updated_at = NOW() WHERE id = ?",
                    [siigoData.name, siigoData.code, siigoData.id, siigoData.id, local.id]
                );
                console.log("✅ CORREGIDO.");
            } else {
                console.log("\n✅ Los nombres coinciden. El usuario quizás ve caché o el cambio no está en Siigo.");
            }
        } else {
            console.log("\n❌ Imposible contactar a SIIGO tras múltiples intentos.");
        }

    } catch (e) {
        console.error(e);
    }
    process.exit();
}

run();
