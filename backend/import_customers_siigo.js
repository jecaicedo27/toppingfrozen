require('dotenv').config();
const siigoService = require('./services/siigoService');
const customerUpdateService = require('./services/customerUpdateService');
const { query } = require('./config/database');

async function importCustomersFromSiigo() {
    console.log('🚀 Iniciando importación de clientes desde SIIGO...');

    try {
        const maxPages = 100; // Limitado para evitar rate limiting
        console.log(`📄 Solicitando hasta ${maxPages} páginas de clientes...`);

        const siigoCustomers = await siigoService.getAllCustomers(maxPages);
        console.log(`📊 Recibidos ${siigoCustomers.length} clientes desde SIIGO`);

        if (siigoCustomers.length === 0) {
            console.log('⚠️  No se recibieron clientes. Puede ser por rate limiting de SIIGO.');
            process.exit(0);
        }

        const existingRows = await query(`SELECT siigo_id FROM customers WHERE siigo_id IS NOT NULL`);
        const existing = new Set(existingRows.map(r => r.siigo_id));
        console.log(`📋 Clientes existentes en BD: ${existing.size}`);

        let processed = 0;
        let created = 0;
        let updated = 0;
        let errors = 0;

        for (const c of siigoCustomers) {
            try {
                const extracted = customerUpdateService.extractCompleteCustomerData(c);
                const beforeExists = existing.has(c.id);
                await customerUpdateService.upsertCustomer(c.id, extracted);
                processed++;

                if (!beforeExists) {
                    existing.add(c.id);
                    created++;
                } else {
                    updated++;
                }

                if (processed % 100 === 0) {
                    console.log(`✅ Progreso: ${processed} procesados, ${created} nuevos, ${updated} actualizados`);
                }

            } catch (e) {
                console.error(`❌ Error procesando cliente ${c?.id}:`, e.message);
                errors++;
            }
        }

        console.log(`\n🎉 IMPORTACIÓN DE CLIENTES COMPLETADA`);
        console.log(`✅ Procesados: ${processed}`);
        console.log(`🆕 Creados: ${created}`);
        console.log(`🔄 Actualizados: ${updated}`);
        console.log(`❌ Errores: ${errors}`);

    } catch (error) {
        console.error('❌ Error en importación de clientes:', error);
    }

    process.exit(0);
}

importCustomersFromSiigo();
