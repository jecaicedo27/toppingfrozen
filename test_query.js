const { query } = require('./backend/config/database');

async function testQuery() {
    // Test the exact query used in wall etController
    const whereClause = `WHERE o.deleted_at IS NULL AND (
    o.status = "revision_cartera" 
    OR (
      o.delivery_method LIKE "%bodega%" 
      AND o.status IN ("en_logistica", "en_empaque", "listo_para_entrega", "preparado", "en_preparacion")
      AND ABS(o.total_amount - COALESCE(o.paid_amount, 0) - (SELECT COALESCE(SUM(amount), 0) FROM cash_register WHERE order_id = o.id AND status = "collected")) > 100
    )
    OR o.is_pending_payment_evidence = 1
  )`;

    const sql = `SELECT o.id, o.order_number, o.total_amount, o.status, o.delivery_method,
    COALESCE(o.paid_amount, 0) as paid_amount,
    (SELECT COALESCE(SUM(amount), 0) FROM cash_register WHERE order_id = o.id AND status IN ('pending', 'collected', 'accepted')) as total_cash_registered
   FROM orders o ${whereClause}`;

    console.log('🔍 Running query...\n');
    const results = await query(sql);

    console.log(`📊 Total results: ${results.length}`);
    const order42027 = results.find(r => r.order_number === 'FV-2-42027');

    if (order42027) {
        console.log('\n✅ Found FV-2-42027!', order42027);
    } else {
        console.log('\n❌ FV-2-42027 NOT found in results');
        console.log('Results:', results.map(r => ({
            order: r.order_number,
            status: r.status,
            delivery: r.delivery_method
        })));
    }

    process.exit(0);
}

testQuery();
