const { pool } = require("./config/database");
const siigoService = require("./services/siigoService");
const axios = require("axios");
require("dotenv").config();

async function run() {
    console.log("🔍 Diagnóstico Forense para PLM01");

    try {
        // 1. Consultar BD Local
        const [rows] = await pool.execute("SELECT id, product_name, internal_code, siigo_id, siigo_product_id, updated_at FROM products WHERE internal_code = 'PLM01'");

        let localUUID = null;

        if (rows.length === 0) {
            console.log("❌ LOCAL: PLM01 no encontrado en la base de datos.");
        } else {
            const local = rows[0];
            localUUID = local.siigo_id;
            console.log("\n📂 DATOS LOCALES:");
            console.log(`   Nombre: "${local.product_name}"`);
            console.log(`   Código: ${local.internal_code}`);
            console.log(`   UUID:   ${local.siigo_id}`);
            console.log(`   Updated:${local.updated_at}`);
        }

        // 2. Consultar SIIGO
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        console.log("\n☁️  DATOS SIIGO (Busqueda por Código 'PLM01'):");
        try {
            const resCode = await axios.get(`${baseURL}/v1/products?code=PLM01`, { headers });
            if (resCode.data.results && resCode.data.results.length > 0) {
                const p = resCode.data.results[0];
                console.log(`   Nombre: "${p.name}"`);
                console.log(`   Código: ${p.code}`);
                console.log(`   UUID:   ${p.id}`);
                console.log(`   Activo: ${p.active}`);
            } else {
                console.log("   ❌ No encontrado en SIIGO por código PLM01");
            }
        } catch (e) {
            console.log(`   ❌ Error consultando por código: ${e.message}`);
        }

        if (localUUID) {
            console.log(`\n☁️  DATOS SIIGO (Busqueda por UUID Local ${localUUID}):`);
            try {
                const resID = await axios.get(`${baseURL}/v1/products/${localUUID}`, { headers });
                const p = resID.data;
                console.log(`   Nombre: "${p.name}"`);
                console.log(`   Código: ${p.code}`);
                console.log(`   UUID:   ${p.id}`);
            } catch (e) {
                console.log(`   ❌ Error/404 consultando por UUID: ${e.message}`);
            }
        }

    } catch (e) {
        console.error("Fatal:", e);
    }
    process.exit();
}

run();
