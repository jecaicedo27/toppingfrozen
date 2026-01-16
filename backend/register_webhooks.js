const WebhookService = require('./services/webhookService');
require('dotenv').config();

async function run() {
    console.log('--- Starting Webhook Registration ---');
    const webhookService = new WebhookService();

    try {
        // Authenticate first
        const auth = await webhookService.authenticate();
        if (!auth) {
            console.error('Authentication failed');
            process.exit(1);
        }

        console.log('Registering Stock Webhooks...');
        await webhookService.setupStockWebhooks();

        console.log('Registering Customer Webhooks...');
        await webhookService.setupCustomerWebhooks();

        console.log('--- Registration Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

run();
