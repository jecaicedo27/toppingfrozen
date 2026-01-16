const { query } = require('./config/database');

const checkOrder = async (id) => {
    try {
        const rows = await query(
            `SELECT id, order_number, status, assigned_messenger_id, messenger_status 
       FROM orders 
       WHERE id = ?`,
            [id]
        );
        console.log(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkOrder(2471);
