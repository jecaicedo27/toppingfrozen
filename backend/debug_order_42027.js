require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugOrder() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute('SELECT * FROM orders WHERE order_number = "FV-2-42027"');
    const orderId = rows[0].id;
    console.log('Order ID:', orderId);
    console.log('Order Status:', rows[0].status);
    console.log('Packaging Status:', rows[0].packaging_status);

    const [items] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    console.log('Items:', items.length);
    for (const item of items) {
        const [piv] = await connection.execute('SELECT * FROM packaging_item_verifications WHERE item_id = ?', [item.id]);
        const p = piv[0];
        console.log(`Item [${item.id}] ${item.name} | Status: ${item.status} | Qty: ${item.quantity} | PIV: ${p ? `Scanned: ${p.scanned_count}, Verified: ${p.is_verified}` : 'NONE'}`);
    }

    const [counts] = await connection.execute(`
      SELECT 
        SUM(CASE WHEN oi.status <> 'replaced' THEN 1 ELSE 0 END) AS item_count,
        COALESCE(SUM(CASE WHEN oi.status <> 'replaced' AND piv.is_verified = 1 THEN 1 ELSE 0 END), 0) AS verified_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN packaging_item_verifications piv ON oi.id = piv.item_id
      WHERE o.id = ?
  `, [orderId]);
    console.log('Counts Query Result:', counts[0]);

    process.exit();
}

debugOrder();
