const { pool } = require("./config/database");
const siigoService = require("./services/siigoService");
require("dotenv").config();

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log("🚀 INICIANDO AUDITORÍA TOTAL DE SINCRONIZACIÓN (MODO ESPEJO)");
    console.log("------------------------------------------------------------");

    try {
        await siigoService.loadConfig();

        let currentPage = 1;
        let hasMorePages = true;
        let totalChecked = 0;
        let totalUpdated = 0;
        let totalNew = 0;
        let totalErrors = 0;

        const updatesLog = [];

        while (hasMorePages) {
            console.log(`\n📄 Consultando Página ${currentPage}...`);
            let products = [];
            let pagination = null;
            let retries = 0;
            let success = false;

            // 1. Fetch con Retry INFINITO/ROBUSTO
            while (!success) {
                try {
                    const response = await siigoService.getProductsPage(currentPage);
                    products = response.results;
                    pagination = response.pagination;

                    // Polyfill si total_pages falta
                    if (!pagination.total_pages && pagination.total_results) {
                        pagination.total_pages = Math.ceil(pagination.total_results / 100);
                    }

                    console.log(`   ✅ Éxito. Paginación: Pag ${pagination.page}/${pagination.total_pages} (Total: ${pagination.total_results})`);
                    success = true;
                } catch (e) {
                    retries++;
                    const waitTime = Math.min(60000, 5000 * retries); // Max 60s
                    console.log(`   ⚠️ Intento ${retries} fallido (Error ${e.response?.status || e.message}). Pausa de ${waitTime / 1000}s...`);
                    // Si es 401 (Auth), recargar config
                    if (e.response?.status === 401) await siigoService.loadConfig();

                    await sleep(waitTime);
                }
            }

            if (!success || !products || products.length === 0) {
                console.log("   ❌ No se pudo obtener la página o está vacía. Terminando.");
                break;
            }

            // 2. Procesar Productos
            for (const p of products) {
                totalChecked++;
                try {
                    // Buscar en DB por UUID
                    let [rows] = await pool.execute("SELECT id, product_name, internal_code, siigo_id, is_active FROM products WHERE siigo_id = ?", [p.id]);

                    // Lógica ESPEJO (Si no encuentra por UUID, buscar por Código)
                    if (rows.length === 0 && p.code) {
                        const [rowsByCode] = await pool.execute("SELECT id, product_name, internal_code, siigo_id, is_active FROM products WHERE internal_code = ?", [p.code]);
                        if (rowsByCode.length > 0) {
                            rows = rowsByCode;
                            console.log(`   🔗 RE-ENLACE: ${p.code} (UUID Cambió: ${rows[0].siigo_id} -> ${p.id})`);
                        }
                    }

                    if (rows.length > 0) {
                        // EXISTE -> COMPARAR
                        const local = rows[0];
                        let needsUpdate = false;
                        const changes = [];

                        // Comparar Nombre
                        if (local.product_name !== p.name) {
                            changes.push(`Nombre: '${local.product_name}' -> '${p.name}'`);
                            needsUpdate = true;
                        }
                        // Comparar Activo
                        const isActive = p.active ? 1 : 0;
                        if (local.is_active !== isActive) {
                            changes.push(`Activo: ${local.is_active} -> ${isActive}`);
                            needsUpdate = true;
                        }
                        // Comparar UUID (si fue re-enlace)
                        if (local.siigo_id !== p.id) {
                            changes.push(`UUID Actualizado`);
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            await pool.execute(
                                "UPDATE products SET product_name = ?, internal_code = ?, is_active = ?, siigo_id = ?, updated_at = NOW(), last_sync_at = NOW() WHERE id = ?",
                                [p.name, p.code, isActive, p.id, local.id]
                            );
                            console.log(`   ✅ UPDATED [${p.code}]: ${changes.join(", ")}`);
                            updatesLog.push(`${p.code}: ${changes.join(", ")}`);
                            totalUpdated++;
                        }
                    } else {
                        // NUEVO (Opcional: insertar si se desea, por ahora solo log)
                        // console.log(`   🆕 NUEVO EN SIIGO: ${p.code} - ${p.name}`);
                        totalNew++;
                    }

                } catch (err) {
                    console.log(`   ❌ Error procesando ${p.code}: ${err.message}`);
                    totalErrors++;
                }
            }

            // 3. Paginación
            if (pagination.total_pages > currentPage) {
                currentPage++;
                await sleep(500); // Rate limiting amigable
            } else {
                hasMorePages = false;
            }
        }

        console.log("\n========================================");
        console.log("📊 RESUMEN FINAL");
        console.log(`   Productos Revisados: ${totalChecked}`);
        console.log(`   Actualizados:        ${totalUpdated}`);
        console.log(`   Nuevos en Siigo:     ${totalNew} (No insertados en este script)`);
        console.log(`   Errores:             ${totalErrors}`);
        console.log("========================================");
        if (updatesLog.length > 0) {
            console.log("📝 Detalle de cambios:");
            updatesLog.forEach(l => console.log("   - " + l));
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    }
    process.exit();
}

run();
