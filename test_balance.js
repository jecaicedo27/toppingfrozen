const { query } = require('./backend/config/database');

async function testOrder() {
    const orderNumber = 'FV-2-42027';

    // 1. Get order details
    const orders = await query(`
    SELECT id, order_number, total_amount, status, delivery_method,
           COALESCE(paid_amount, 0) as paid_amount,
           (SELECT COALESCE(SUM(amount), 0) FROM cash_register WHERE order_id = orders.id AND status IN ('pending', 'collected', 'accepted')) as total_cash_registered
    FROM orders 
    WHERE order_number = ?
  `, [orderNumber]);

    if (orders.length === 0) {
        console.log('❌ Order not found');
        process.exit(1);
    }

    const order = orders[0];
    console.log('📦 Order Details:', order);

    // 2. Calculate balance
    const total = parseFloat(order.total_amount);
    const paid = parseFloat(order.paid_amount);
    const cashRegistered = parseFloat(order.total_cash_registered);

    const balance = total - paid - cashRegistered;
    const absBalance = Math.abs(balance);

    console.log('\n💰 Balance Calculation:');
    console.log('  Total:', total.toLocaleString());
    console.log('  Paid Amount:', paid.toLocaleString());
    console.log('  Cash Registered:', cashRegistered.toLocaleString());
    console.log('  Balance:', balance.toLocaleString());
    console.log('  Abs Balance:', absBalance.toLocaleString());
    console.log('  Should show in refunds?', absBalance > 100 && balance < 0);

    process.exit(0);
}

testOrder();
