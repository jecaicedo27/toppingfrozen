const WebhookService = require('./services/webhookService');
const { query } = require('./config/database');

async function reconfigureWebhooks() {
    try {
        console.log('🔄 Starting webhook reconfiguration...');

        // 1. Mark old subscriptions as inactive in DB (optional cleanup)
        await query("UPDATE webhook_subscriptions SET active = 0 WHERE application_id = 'GestionPedidos'");
        console.log('📝 Marked old subscriptions as inactive.');

        // 2. Setup new webhooks
        const service = new WebhookService();
        await service.authenticate();

        console.log('🚀 Setting up Stock Webhooks...');
        await service.setupStockWebhooks();

        console.log('🚀 Setting up Customer Webhooks...');
        await service.setupCustomerWebhooks();

        console.log('✅ Reconfiguration complete.');

    } catch (error) {
        console.error('❌ Error during reconfiguration:', error);
    } finally {
        process.exit();
    }
}

reconfigureWebhooks();
