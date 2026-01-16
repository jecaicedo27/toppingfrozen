const axios = require('axios');

async function testAPI() {
    try {
        const response = await axios.get('http://localhost:5000/api/cartera/orders', {
            params: {
                view: 'cartera',
                status: 'revision_cartera',
                limit: 100
            }
        });

        const orders = response.data?.data?.orders || [];
        console.log(`📊 Total orders returned: ${orders.length}`);

        const order42027 = orders.find(o => o.order_number === 'FV-2-42027');

        if (order42027) {
            console.log('\n✅ Order FV-2-42027 FOUND in API response!');
            console.log('Order data:', {
                order_number: order42027.order_number,
                total_amount: order42027.total_amount,
                paid_amount: order42027.paid_amount,
                total_cash_registered: order42027.total_cash_registered,
                status: order42027.status,
                delivery_method: order42027.delivery_method
            });
        } else {
            console.log('\n❌ Order FV-2-42027 NOT in API response');
            console.log('Orders returned:', orders.map(o => o.order_number));
        }

    } catch (error) {
        console.error('❌ API Error:', error.message);
    }

    process.exit(0);
}

testAPI();
