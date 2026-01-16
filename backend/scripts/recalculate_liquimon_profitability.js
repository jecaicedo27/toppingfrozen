const { query } = require('../config/database');

async function recalculateLiquimonProfitability() {
    try {
        console.log('🔄 Iniciando recálculo de rentabilidad para productos Liquimon...');

        // 1. Obtener todos los productos Liquimon con sus precios actuales
        const liquimonProducts = await query(`
            SELECT internal_code, product_name, purchasing_price
            FROM products
            WHERE product_name LIKE '%LIQUIMON%' OR product_name LIKE '%CITRICA%'
        `);

        console.log(`📦 Encontrados ${liquimonProducts.length} productos Liquimon:`);
        liquimonProducts.forEach(p => {
            console.log(`   - ${p.internal_code}: ${p.product_name} - Costo: $${p.purchasing_price}`);
        });

        if (liquimonProducts.length === 0) {
            console.log('⚠️  No se encontraron productos Liquimon');
            return;
        }

        // 2. Obtener todos los order_items históricos de estos productos
        const productCodes = liquimonProducts.map(p => p.internal_code);
        const placeholders = productCodes.map(() => '?').join(',');

        const historicalItems = await query(`
            SELECT 
                oi.id,
                oi.product_code,
                oi.quantity,
                oi.price,
                oi.discount_percent,
                oi.purchase_cost as old_cost,
                o.created_at as order_date
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_code IN (${placeholders})
            AND o.status NOT IN ('cancelado', 'anulado')
            AND o.deleted_at IS NULL
            ORDER BY o.created_at DESC
        `, productCodes);

        console.log(`📊 Encontrados ${historicalItems.length} items históricos para actualizar`);

        if (historicalItems.length === 0) {
            console.log('✅ No hay items para actualizar');
            return;
        }

        // 3. Actualizar cada item con el nuevo costo y recalcular profit
        let updatedCount = 0;
        let totalOldProfit = 0;
        let totalNewProfit = 0;

        for (const item of historicalItems) {
            // Buscar el precio de compra actual del producto
            const product = liquimonProducts.find(p => p.internal_code === item.product_code);
            if (!product) continue;

            const newUnitCost = parseFloat(product.purchasing_price);
            const unitPrice = parseFloat(item.price);
            const quantity = parseFloat(item.quantity);
            const discount = parseFloat(item.discount_percent) || 0;
            const netUnitPrice = unitPrice * (1 - discount / 100);

            // Calcular nueva rentabilidad
            const newTotalProfit = (netUnitPrice - newUnitCost) * quantity;
            const newProfitPercent = netUnitPrice !== 0 ? ((netUnitPrice - newUnitCost) / netUnitPrice) * 100 : 0;

            // Calcular rentabilidad antigua para comparación
            const oldUnitCost = parseFloat(item.old_cost) || 0;
            const oldTotalProfit = (netUnitPrice - oldUnitCost) * quantity;

            totalOldProfit += oldTotalProfit;
            totalNewProfit += newTotalProfit;

            // Actualizar en la base de datos
            await query(`
                UPDATE order_items
                SET 
                    purchase_cost = ?,
                    profit_amount = ?,
                    profit_percent = ?
                WHERE id = ?
            `, [newUnitCost, newTotalProfit, newProfitPercent, item.id]);

            updatedCount++;

            if (updatedCount % 100 === 0) {
                console.log(`   ✓ Procesados ${updatedCount}/${historicalItems.length} items...`);
            }
        }

        console.log('\n✅ Recálculo completado!');
        console.log(`📊 Estadísticas:`);
        console.log(`   - Items actualizados: ${updatedCount}`);
        console.log(`   - Rentabilidad antigua total: $${totalOldProfit.toFixed(2)}`);
        console.log(`   - Rentabilidad nueva total: $${totalNewProfit.toFixed(2)}`);
        console.log(`   - Diferencia: $${(totalNewProfit - totalOldProfit).toFixed(2)}`);

        // 4. Mostrar resumen por mes
        console.log('\n📅 Resumen por mes:');
        const monthlyStats = await query(`
            SELECT 
                DATE_FORMAT(o.created_at, '%Y-%m') as month,
                COUNT(DISTINCT oi.id) as items,
                SUM(oi.profit_amount) as total_profit
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_code IN (${placeholders})
            AND o.status NOT IN ('cancelado', 'anulado')
            AND o.deleted_at IS NULL
            GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
            ORDER BY month DESC
            LIMIT 6
        `, productCodes);

        monthlyStats.forEach(stat => {
            console.log(`   ${stat.month}: ${stat.items} items, Rentabilidad: $${parseFloat(stat.total_profit).toFixed(2)}`);
        });

    } catch (error) {
        console.error('❌ Error recalculando rentabilidad:', error);
        throw error;
    }
}

// Ejecutar
recalculateLiquimonProfitability()
    .then(() => {
        console.log('\n🎉 Proceso finalizado exitosamente');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
