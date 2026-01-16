require('dotenv').config();
const siigoService = require('./services/siigoService');
const customerUpdateService = require('./services/customerUpdateService');
const { query } = require('./config/database');

async function importCustomersIncrementally() {
    console.log('🚀 Iniciando importación INCREMENTAL de clientes desde SIIGO...');

    try {
        let created = 0;
        let updated = 0;
        let errors = 0;
        let currentPage = 1;
        const maxPages = 250; // Suficiente para ~10,000 clientes (201 páginas)
        let hasMore = true;

        while (hasMore && currentPage <= maxPages) {
            try {
                console.log(`\n📄 Procesando página ${currentPage}...`);

                const result = await siigoService.getCustomers({
                    page: currentPage,
                    page_size: 50
                });

                const customers = result?.results || [];

                if (!customers || customers.length === 0) {
                    console.log('✅ No hay más clientes en esta página');
                    hasMore = false;
                    break;
                }

                console.log(`👥 Recibidos ${customers.length} clientes de página ${currentPage}`);

                // Procesar y guardar INMEDIATAMENTE cada cliente
                for (const c of customers) {
                    try {
                        if (!c.id) {
                            console.log('⚠️  Cliente sin ID, omitiendo');
                            continue;
                        }

                        // Verificar si existe
                        const [existingRows] = await query(
                            'SELECT siigo_id FROM customers WHERE siigo_id = ?',
                            [c.id]
                        );
                        const exists = existingRows && existingRows.length > 0;

                        // Extraer y guardar
                        const extracted = customerUpdateService.extractCompleteCustomerData(c);
                        await customerUpdateService.upsertCustomer(c.id, extracted);

                        if (exists) {
                            updated++;
                        } else {
                            created++;
                        }

                        if ((created + updated) % 50 === 0) {
                            console.log(`✅ Progreso: ${created} nuevos, ${updated} actualizados, ${errors} errores`);
                        }

                    } catch (e) {
                        console.error(`❌ Error procesando cliente ${c?.id}:`, e.message);
                        errors++;
                    }
                }

                // Si recibimos menos de 50, es la última página
                if (customers.length < 50) {
                    hasMore = false;
                } else {
                    currentPage++;
                    // Rate limiting entre páginas
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (pageError) {
                console.error(`❌ Error en página ${currentPage}:`, pageError.message);
                // Intentar continuar con la siguiente página
                currentPage++;
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.log(`\n🎉 IMPORTACIÓN COMPLETADA`);
        console.log(`✅ Creados: ${created}`);
        console.log(`🔄 Actualizados: ${updated}`);
        console.log(`❌ Errores: ${errors}`);
        console.log(`📊 Total procesados: ${created + updated}`);

    } catch (error) {
        console.error('❌ Error en importación:', error);
    }

    process.exit(0);
}

importCustomersIncrementally();
