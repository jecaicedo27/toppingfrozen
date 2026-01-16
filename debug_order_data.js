const { query } = require('./backend/config/database');

async function debugOrder() {
    const orderNumber = 'FV-2-42027';
    console.log(`Searching for order: ${orderNumber}`);

    const orders = await query('SELECT id, order_number, total_amount, paid_amount, status, packaging_status FROM orders WHERE order_number = ?', [orderNumber]);
    console.log('Order Details:', orders);

    if (orders.length > 0) {
        const cash = await query('SELECT * FROM cash_register WHERE order_id = ?', [orders[0].id]);
        console.log('Cash Register Entries:', cash);

        // Calculate total paid from cash register
        const totalPaid = cash.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
        console.log('Calculated Total Paid:', totalPaid);
        console.log('Balance (Total - Paid):', parseFloat(orders[0].total_amount) - totalPaid);
    }

    process.exit(0);
}

debugOrder();
