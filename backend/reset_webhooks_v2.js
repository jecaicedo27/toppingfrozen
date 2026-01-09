const service = require('./services/siigoService');
const axios = require('axios');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function cleanAndSetup() {
    try {
        console.log('🔄 Authenticating...');
        const headers = await service.getHeaders();
        const baseUrl = service.getBaseUrl();

        // 1. Loop until no webhooks remain
        let attempts = 0;
        while (attempts < 5) {
            attempts++;
            console.log(`\n📋 Checking existing webhooks (Attempt ${attempts})...`);

            let existingHooks = [];
            try {
                const hooksResp = await axios.get(`${baseUrl}/v1/webhooks`, { headers });
                existingHooks = hooksResp.data;
            } catch (e) {
                if (e.response && e.response.status === 429) {
                    console.log('⏳ Rate limit on GET, waiting 5s...');
                    await sleep(5000);
                    continue;
                }
                throw e;
            }

            if (!existingHooks || existingHooks.length === 0) {
                console.log('✨ No existing webhooks found. Ready to setup.');
                break;
            }

            console.log(`🗑️ Found ${existingHooks.length} existing webhooks. Deleting one by one...`);

            for (const hook of existingHooks) {
                try {
                    console.log(`   - Deleting ${hook.id} (${hook.topic})...`);
                    await axios.delete(`${baseUrl}/v1/webhooks/${hook.id}`, { headers });
                    console.log('     ✅ Deleted.');
                    await sleep(2000); // 2s pause between deletes to be safe
                } catch (delErr) {
                    if (delErr.response && delErr.response.status === 429) {
                        console.log('     ⏳ Rate limit on DELETE, waiting 10s...');
                        await sleep(10000);
                    } else if (delErr.response && delErr.response.status === 404) {
                        console.log('     ⚠️ Already deleted.');
                    } else {
                        console.error(`     ❌ Failed to delete ${hook.id}:`, delErr.message);
                    }
                }
            }

            await sleep(2000);
        }

        if (attempts >= 5) {
            console.error('❌ Could not clear all webhooks after 5 attempts. Aborting.');
            process.exit(1);
        }

        // 2. Setup (Slowly)
        const WebhookService = require('./services/webhookService');
        const webhookService = new WebhookService();
        await webhookService.authenticate();

        console.log('\n🚀 Setting up NEW Webhooks (GestionToppingFrozen)...');
        await webhookService.setupStockWebhooks();
        await sleep(3000);
        await webhookService.setupCustomerWebhooks();

        console.log('\n✅ Full reset and reconfiguration complete.');

    } catch (e) {
        console.error('❌ Error:', e.message);
        if (e.response) console.error('Data:', JSON.stringify(e.response.data, null, 2));
    } finally {
        process.exit();
    }
}

cleanAndSetup();
