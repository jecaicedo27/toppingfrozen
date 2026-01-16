const { query } = require('./config/database');

async function run() {
    try {
        console.log('Buscando pedidos con pagos aceptados pero en revision_cartera...');

        const result = await query(`
      UPDATE orders o
      INNER JOIN cash_register cr ON cr.order_id = o.id
      SET o.status = 'en_logistica', o.updated_at = NOW()
      WHERE o.status = 'revision_cartera'
        AND cr.status = 'collected'
        AND o.delivery_method IN ('recoge_bodega', 'recogida_tienda')
    `);

        console.log('✅ Pedidos movidos a logística:', result.affectedRows);

        const fixed = await query(`
      SELECT o.id, o.order_number, o.status
      FROM orders o
      INNER JOIN cash_register cr ON cr.order_id = o.id
      WHERE cr.status = 'collected'
        AND o.delivery_method IN ('recoge_bodega', 'recogida_tienda')
      ORDER BY o.id
    `);

        console.table(fixed);
    } finally {
        process.exit();
    }
}

run();
