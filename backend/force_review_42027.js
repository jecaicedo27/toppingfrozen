require('dotenv').config();
const mysql = require('mysql2/promise');

async function forceReview() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [res] = await connection.execute("UPDATE orders SET packaging_status = 'requires_review' WHERE order_number = 'FV-2-42027'");
    console.log('Update Result:', res.info);

    process.exit();
}

forceReview();
