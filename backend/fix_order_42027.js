require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixOrder() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [rows] = await connection.execute('SELECT * FROM orders WHERE order_number = "FV-2-42027"');
    const orderId = rows[0].id;

    // Find the item with problem (Perlas Blueberry or ID 17047)
    // Assuming it's the one with scanned=NULL or the latest one
    const [items] = await connection.execute('SELECT * FROM order_items WHERE order_id = ? ORDER BY id DESC LIMIT 1', [orderId]);
    const item = items[0];

    console.log('Fixing Item:', item.id, item.name);

    // Check PIV
    const [pivs] = await connection.execute('SELECT * FROM packaging_item_verifications WHERE item_id = ?', [item.id]);
    if (pivs.length === 0) {
        console.log('Inserting missing PIV...');
        await connection.execute(`
          INSERT INTO packaging_item_verifications 
          (order_id, item_id, scanned_count, required_scans, is_verified, verified_by)
          VALUES (?, ?, 0, ?, 0, 'fix_script')
      `, [orderId, item.id, item.quantity]);
    } else {
        console.log('Resetting existing PIV...');
        await connection.execute(`
          UPDATE packaging_item_verifications 
          SET scanned_count = 0, is_verified = 0, required_scans = ?
          WHERE item_id = ?
      `, [item.quantity, item.id]);
    }

    // Force Requires Review
    await connection.execute("UPDATE orders SET packaging_status = 'requires_review' WHERE id = ?", [orderId]);

    console.log('Fixed Order 42027');
    process.exit();
}

fixOrder();
