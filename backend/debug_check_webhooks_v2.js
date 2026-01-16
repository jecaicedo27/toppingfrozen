const service = require('./services/siigoService');
const axios = require('axios');

async function check() {
    try {
        console.log('🔄 Getting headers (authenticating)...');
        const headers = await service.getHeaders(); // This handles DB lookup and decryption

        console.log('✅ Authenticated. Fetching webhooks...');
        const baseUrl = service.getBaseUrl();

        console.log(`🔗 Checking webhooks at ${baseUrl}/v1/webhooks`);
        const hooksResp = await axios.get(`${baseUrl}/v1/webhooks`, { headers });
        console.log('📋 Active Webhooks on Siigo:');
        console.log(JSON.stringify(hooksResp.data, null, 2));

    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.response) console.error('Data:', JSON.stringify(e.response.data, null, 2));
    } finally {
        process.exit();
    }
}

check();
