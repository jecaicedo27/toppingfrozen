require('dotenv').config();
const path = require('path');
const siigoService = require('./services/siigoService');
const { query } = require('./config/database');

async function importAllInvoicesBulk() {
    console.log('🚀 Iniciando importación masiva de facturas SIIGO...');

    const startDate = '2025-12-01';
    let currentPage = 1;
    let totalImported = 0;
    let totalSkipped = 0;
    let hasMorePages = true;

    try {
        while (hasMorePages) {
            console.log(`\n📄 Página ${currentPage}...`);

            const result = await siigoService.getInvoices({
                created_start: startDate,
                page: currentPage,
                page_size: 100
            });

            const invoices = result?.results || [];

            if (!invoices || invoices.length === 0) {
                console.log('✅ No hay más facturas');
                hasMorePages = false;
                break;
            }

            console.log(`📋 Procesando ${invoices.length} facturas de página ${currentPage}`);

            for (const invoice of invoices) {
                try {
                    // Verificar si ya existe
                    const [existing] = await query(
                        'SELECT id FROM siigo_sync_log WHERE siigo_invoice_id = ? AND sync_status = "success"',
                        [invoice.id]
                    );

                    if (existing && existing.length > 0) {
                        totalSkipped++;
                        continue;
                    }

                    // Importar factura
                    const importResult = await siigoService.processInvoiceToOrder(invoice);

                    if (importResult?.orderId) {
                        totalImported++;
                        console.log(`✅ ${invoice.number || invoice.id} → Pedido ${importResult.orderId}`);
                    }

                    // Rate limiting: esperar 100ms entre facturas
                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    console.error(`❌ Error con ${invoice.id}:`, error.message);
                }
            }

            // Si obtuvimos menos de 100, es la última página
            if (invoices.length < 100) {
                hasMorePages = false;
            } else {
                currentPage++;
                // Rate limiting entre páginas: esperar 1 segundo
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`\n🎉 IMPORTACIÓN COMPLETADA`);
        console.log(`✅ Importadas: ${totalImported}`);
        console.log(`⏭️  Ya existían: ${totalSkipped}`);
        console.log(`📊 Total procesadas: ${totalImported + totalSkipped}`);

    } catch (error) {
        console.error('❌ Error en importación masiva:', error);
    }

    process.exit(0);
}

importAllInvoicesBulk();
