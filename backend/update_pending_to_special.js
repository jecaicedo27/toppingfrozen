const { query } = require('./config/database');

async function updatePendingOrdersToSpecial() {
    try {
        console.log('📦 Updating pipeline orders (Logistics, Ready, Delivery, Carrier) to "gestion_especial"...');

        // 1. Get IDs of orders to update
        // We include all statuses visible on the dashboard cards that the user indicated:
        // - en_logistica (Pendientes Logística)
        // - listo_para_entrega (Listos para Entregar)
        // - en_reparto (Pendientes Entrega)
        // - entregado_transportadora (Envíos Transportadora - the scribbled one)
        // AND any order that is already 'gestion_especial' but has an active messenger status.

        const validStatuses = [
            'en_logistica',
            'listo_para_entrega',
            'en_reparto',
            'entregado_transportadora'
        ];

        const ordersToUpdate = await query(`
            SELECT id, siigo_invoice_number, status, messenger_status FROM orders 
            WHERE status IN (?)
            OR (status = 'gestion_especial' AND messenger_status IN ('accepted', 'in_delivery'))
        `, [validStatuses]);

        if (ordersToUpdate.length === 0) {
            console.log('⚠️ No orders found in pipeline statuses.');
            process.exit(0);
        }

        const ids = ordersToUpdate.map(o => o.id);
        console.log(`📋 Found ${ids.length} orders to update.`);

        // Breakdown (optional logging)
        const breakdown = {};
        ordersToUpdate.forEach(o => {
            const key = `${o.status} / ${o.messenger_status}`;
            breakdown[key] = (breakdown[key] || 0) + 1;
        });
        console.table(breakdown);

        // 2. Update status and special_management_note
        // CRITICAL: Set messenger_status to 'cancelled' to remove from dashboard counters.
        const reason = 'Procesamiento masivo solicitado por administrador';

        const updateResult = await query(`
            UPDATE orders 
            SET status = 'gestion_especial', 
                special_management_note = ?, 
                messenger_status = 'cancelled',
                updated_at = NOW()
            WHERE id IN (?)
        `, [reason, ids]);

        console.log(`✅ Successfully updated ${updateResult.affectedRows} orders in 'orders' table.`);

        // 3. Add audit entries (Batching manually or one-by-one to avoid query size limits)
        // Using 'UPDATE' because 'SPECIAL_MANAGED' is not in the ENUM.
        // Storing reason in customer_name as per controller pattern.

        const now = new Date();
        const userId = null; // System

        if (ids.length > 0) {
            const auditValues = ordersToUpdate.map(o => [
                o.id,
                'UPDATE',
                o.siigo_invoice_number || null,
                reason, // Storing reason in customer_name
                userId,
                now
            ]);

            await query(`
                INSERT INTO orders_audit (order_id, action, siigo_invoice_number, customer_name, user_id, created_at)
                VALUES ?
            `, [auditValues]);

            console.log(`✅ Added ${auditValues.length} audit entries.`);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error updating orders:', error);
        process.exit(1);
    }
}

updatePendingOrdersToSpecial();
