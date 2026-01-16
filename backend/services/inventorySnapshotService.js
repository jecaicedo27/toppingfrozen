const cron = require('node-cron');
const { query } = require('../config/database');

class InventorySnapshotService {
    constructor() {
        this.task = null;
    }

    async captureSnapshot() {
        try {
            console.log('📸 Iniciando captura de snapshot de inventario...');

            // Obtener todos los productos activos con su stock actual
            const products = await query(`
                SELECT 
                    p.id,
                    p.product_name,
                    p.internal_code,
                    p.stock as current_stock,
                    p.purchasing_price as purchase_cost,
                    COALESCE(pic.min_inventory_qty, 0) as min_inventory,
                    COALESCE(pic.suggested_order_qty, 0) as suggested_qty_config
                FROM products p
                LEFT JOIN product_inventory_config pic ON p.id = pic.product_id
                WHERE p.internal_code NOT IN ('DO', 'FL01', 'PROPINA')
                AND p.is_active = 1
            `);

            console.log(`📦 Procesando ${products.length} productos...`);

            // Calcular consumo promedio diario (últimos 30 días)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            let snapshotsCreated = 0;

            for (const product of products) {
                // Calcular consumo diario
                const [consumptionData] = await query(`
                    SELECT 
                        COALESCE(SUM(oi.quantity), 0) as total_sold,
                        COUNT(DISTINCT DATE(o.created_at)) as days_with_sales
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    WHERE oi.product_code = ?
                    AND o.created_at >= ?
                    AND o.status NOT IN ('cancelado', 'anulado')
                    AND o.deleted_at IS NULL
                `, [product.internal_code, thirtyDaysAgo]);

                const avgDailyConsumption = consumptionData.days_with_sales > 0
                    ? consumptionData.total_sold / 30
                    : 0;

                // Calcular días hasta agotamiento
                const daysUntilStockout = avgDailyConsumption > 0
                    ? Math.floor(product.current_stock / avgDailyConsumption)
                    : null;

                // Determinar tendencia
                let consumptionTrend = 'stable';
                if (avgDailyConsumption === 0) {
                    consumptionTrend = 'none';
                } else if (daysUntilStockout !== null && daysUntilStockout < 7) {
                    consumptionTrend = 'high';
                } else if (daysUntilStockout !== null && daysUntilStockout > 30) {
                    consumptionTrend = 'low';
                }

                // Calcular cantidad sugerida (30 días de consumo menos stock actual)
                const targetStock = avgDailyConsumption > 0 ? avgDailyConsumption * 30 : product.min_inventory;
                const suggestedQty = Math.max(0, Math.round(targetStock - product.current_stock));

                // Guardar snapshot
                await query(`
                    INSERT INTO inventory_analysis_history 
                    (product_id, analysis_date, avg_daily_consumption, consumption_trend, 
                     suggested_qty, current_stock, days_until_stockout)
                    VALUES (?, NOW(), ?, ?, ?, ?, ?)
                `, [
                    product.id,
                    avgDailyConsumption,
                    consumptionTrend,
                    Math.round(suggestedQty),
                    product.current_stock,
                    daysUntilStockout
                ]);

                snapshotsCreated++;
            }

            console.log(`✅ Snapshot de inventario completado: ${snapshotsCreated} productos registrados`);

            // Limpiar snapshots antiguos (mantener solo 90 días)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const deleteResult = await query(`
                DELETE FROM inventory_analysis_history 
                WHERE analysis_date < ?
            `, [ninetyDaysAgo]);

            if (deleteResult.affectedRows > 0) {
                console.log(`🗑️  Eliminados ${deleteResult.affectedRows} snapshots antiguos (>90 días)`);
            }

        } catch (error) {
            console.error('❌ Error capturando snapshot de inventario:', error);
        }
    }

    start() {
        // Ejecutar todos los días a las 23:55
        this.task = cron.schedule('55 23 * * *', async () => {
            console.log('⏰ Tarea programada: Captura de snapshot de inventario');
            await this.captureSnapshot();
        }, {
            timezone: "America/Bogota"
        });

        console.log('📅 Servicio de snapshot de inventario iniciado (diario a las 23:55)');
    }

    stop() {
        if (this.task) {
            this.task.stop();
            console.log('🛑 Servicio de snapshot de inventario detenido');
        }
    }
}

module.exports = new InventorySnapshotService();
