const { query } = require('./config/database');

const checkOrder = async (orderNumber) => {
    try {
        const rows = await query(
            `SELECT id, order_number, status, is_modified_after_packing, packing_snapshot, updated_at 
       FROM orders 
       WHERE order_number = ?`,
            [orderNumber]
        );

        if (rows.length === 0) {
            console.log('Order not found');
            return;
        }

        const order = rows[0];
        console.log('Order Details:', {
            id: order.id,
            number: order.order_number,
            status: order.status,
            is_modified: order.is_modified_after_packing,
            updated_at: order.updated_at
        });

        console.log('Snapshot present?', !!order.packing_snapshot);
        if (order.packing_snapshot) {
            let snap = order.packing_snapshot;
            if (typeof snap === 'string') {
                console.log('Snapshot Preview:', snap.substring(0, 100) + '...');
                try { snap = JSON.parse(snap); } catch (e) { }
            } else {
                console.log('Snapshot is Object/Array');
            }

            if (Array.isArray(snap)) {
                console.log('Snapshot Items Count:', snap.length);
                console.log('Snapshot Items:', snap.map(i => `${i.product_code}: ${i.quantity}`));
            }
        }

        // Get Current Items
        const items = await query('SELECT product_code, quantity, name FROM order_items WHERE order_id = ?', [order.id]);
        console.log('Current Items:', items.map(i => `${i.product_code}: ${i.quantity}`));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

const target = process.argv[2] || 'FV-2-42023';
checkOrder(target);
