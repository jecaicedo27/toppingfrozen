const service = require('./services/siigoService');
const axios = require('axios');

async function cleanAndSetup() {
    try {
        console.log('🔄 Authenticating...');
        const headers = await service.getHeaders();
        const baseUrl = service.getBaseUrl();

        // 1. Get all webhooks
        console.log('📋 Fetching existing webhooks...');
        const hooksResp = await axios.get(`${baseUrl}/v1/webhooks`, { headers });
        const existingHooks = hooksResp.data;

        if (existingHooks && existingHooks.length > 0) {
            console.log(`🗑️ Found ${existingHooks.length} existing webhooks. Deleting...`);
            for (const hook of existingHooks) {
                try {
                    console.log(`   - Deleting webhook ${hook.id} (${hook.topic})...`);
                    await axios.delete(`${baseUrl}/v1/webhooks/${hook.id}`, { headers });
                    console.log('     ✅ Deleted.');
                } catch (delErr) {
                    console.error(`     ❌ Failed to delete ${hook.id}:`, delErr.message);
                }
            }
        } else {
            console.log('✨ No existing webhooks found.');
        }

        // 2. Run the setup again (which runs the services/webhookService.js logic with the new name)
        // We can just invoke the WebhookService methods directly
        const WebhookService = require('./services/webhookService');
        const webhookService = new WebhookService();

        // Ensure authentication for the webhook service instance too
        await webhookService.authenticate();

        console.log('🚀 Setting up new Stock Webhooks...');
        await webhookService.setupStockWebhooks();

        console.log('🚀 Setting up new Customer Webhooks...');
        await webhookService.setupCustomerWebhooks();

        console.log('✅ Full reset and reconfiguration complete.');

    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.response) console.error('Data:', JSON.stringify(e.response.data, null, 2));
    } finally {
        process.exit();
    }
}

cleanAndSetup();
