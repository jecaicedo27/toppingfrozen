require('dotenv').config();
const siigoService = require('./services/siigoService');
const { query } = require('./config/database');

async function importAllCustomersDirectly() {
    console.log('🚀 Importando TODOS los clientes desde SIIGO...');

    try {
        let created = 0;
        let updated = 0;
        let errors = 0;
        let currentPage = 1;
        const maxPages = 250;
        let hasMore = true;

        while (hasMore && currentPage <= maxPages) {
            try {
                console.log(`\n📄 Página ${currentPage}/${maxPages}...`);

                const result = await siigoService.getCustomers({
                    page: currentPage,
                    page_size: 50
                });

                const customers = result?.results || [];

                if (!customers || customers.length === 0) {
                    console.log('✅ No hay más clientes');
                    hasMore = false;
                    break;
                }

                console.log(`👥 Procesando ${customers.length} clientes...`);

                for (const c of customers) {
                    try {
                        if (!c.id || !c.identification) continue;

                        // Verificar si existe
                        const [existingRows] = await query(
                            'SELECT id FROM customers WHERE siigo_id = ?',
                            [c.id]
                        );
                        const exists = existingRows && existingRows.length > 0;

                        const name = c.name || c.commercial_name || 'Sin nombre';
                        const identification = c.identification || '';
                        const docType = c.id_type?.name || 'CC';
                        const email = c.contacts?.[0]?.email || '';
                        const phone = c.phones?.[0]?.number || '';
                        const address = c.address?.address || '';
                        const city = c.address?.city?.city_name || '';
                        const state = c.address?.city?.state_name || '';
                        const commercial_name = c.commercial_name || null;

                        if (exists) {
                            // Actualizar
                            await query(
                                `UPDATE customers SET 
                  name = ?, commercial_name = ?, phone = ?, 
                  email = ?, address = ?, city = ?, state = ?,
                  updated_at = NOW()
                WHERE siigo_id = ?`,
                                [name, commercial_name, phone, email, address, city, state, c.id]
                            );
                            updated++;
                        } else {
                            // Insertar
                            await query(
                                `INSERT INTO customers (
                  siigo_id, name, commercial_name, identification, document_type,
                  phone, email, address, city, state
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [c.id, name, commercial_name, identification, docType, phone, email, address, city, state]
                            );
                            created++;
                        }

                    } catch (e) {
                        console.error(`❌ Error con cliente ${c?.id}:`, e.message);
                        errors++;
                    }
                }

                console.log(`✅ Página ${currentPage}: +${created} nuevos, ~${updated} actualizados, ✗${errors} errores`);

                if (customers.length < 50) {
                    hasMore = false;
                } else {
                    currentPage++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (pageError) {
                console.error(`❌ Error en página ${currentPage}:`, pageError.message);
                currentPage++;
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.log(`\n🎉 IMPORTACIÓN COMPLETADA`);
        console.log(`✅ Creados: ${created}`);
        console.log(`🔄 Actualizados: ${updated}`);
        console.log(`❌ Errores: ${errors}`);

    } catch (error) {
        console.error('❌ Error fatal:', error);
    }

    process.exit(0);
}

importAllCustomersDirectly();
