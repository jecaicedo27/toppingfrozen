require('dotenv').config();
const siigoService = require('./services/siigoService');
const { query } = require('./config/database');

async function importAllCustomers() {
    console.log('🚀 Iniciando importación de clientes desde SIIGO...');

    let currentPage = 1;
    let totalImported = 0;
    let totalSkipped = 0;
    let hasMorePages = true;

    try {
        while (hasMorePages) {
            console.log(`\n📄 Página ${currentPage}...`);

            const result = await siigoService.getCustomers({
                page: currentPage,
                page_size: 100
            });

            const customers = result?.results || [];

            if (!customers || customers.length === 0) {
                console.log('✅ No hay más clientes');
                hasMorePages = false;
                break;
            }

            console.log(`👥 Procesando ${customers.length} clientes de página ${currentPage}`);

            for (const customer of customers) {
                try {
                    if (!customer.id || !customer.identification) {
                        console.log(`⚠️ Cliente inválido sin ID o identificación, omitiendo`);
                        continue;
                    }

                    // Verificar si ya existe
                    const [existing] = await query(
                        'SELECT id FROM customers WHERE siigo_id = ?',
                        [customer.id]
                    );

                    if (existing && existing.length > 0) {
                        totalSkipped++;
                        continue;
                    }

                    // Extraer datos del cliente
                    const name = customer.name || customer.commercial_name || 'Sin nombre';
                    const identification = customer.identification || '';
                    const idType = customer.id_type?.name || 'CC';
                    const personType = customer.person_type === 'Person' ? 'natural' : 'juridica';
                    const email = customer.contacts?.[0]?.email || '';
                    const phone = customer.phones?.[0]?.number || '';
                    const address = customer.address?.address || '';
                    const city = customer.address?.city?.city_name || '';
                    const department = customer.address?.city?.state_name || '';

                    // Insertar cliente
                    await query(
                        `INSERT INTO customers (
              siigo_id, name, identification, document_type,
              email, phone, address, city, state,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                        [customer.id, name, identification, idType, email, phone, address, city, department]
                    );

                    totalImported++;

                    if (totalImported % 50 === 0) {
                        console.log(`✅ Importados ${totalImported} clientes hasta ahora...`);
                    }

                } catch (error) {
                    console.error(`❌ Error con cliente ${customer.id}:`, error.message);
                }
            }

            if (customers.length < 100) {
                hasMorePages = false;
            } else {
                currentPage++;
                // Rate limiting entre páginas
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log(`\n🎉 IMPORTACIÓN DE CLIENTES COMPLETADA`);
        console.log(`✅ Importados: ${totalImported}`);
        console.log(`⏭️  Ya existían: ${totalSkipped}`);
        console.log(`📊 Total procesados: ${totalImported + totalSkipped}`);

    } catch (error) {
        console.error('❌ Error en importación de clientes:', error);
    }

    process.exit(0);
}

importAllCustomers();
