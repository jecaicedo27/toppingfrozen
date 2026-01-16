require('dotenv').config();
const siigoService = require('./services/siigoService');
const axios = require('axios');

async function getCustomer() {
    try {
        console.log('Authenticating...');
        // Ensure credentials can be loaded
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const identification = '1030547580';

        console.log(`Fetching customer with ID ${identification} from SIIGO...`);
        // Note: verify if siigoService.baseURL is accessible or if we need to use getBaseUrl() or 'https://api.siigo.com'
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        const response = await axios.get(`${baseURL}/v1/customers`, {
            headers,
            params: { identification: identification }
        });

        if (response.data.results && response.data.results.length > 0) {
            console.log('--- CUSTOMER JSON START ---');
            console.log(JSON.stringify(response.data.results[0], null, 2));
            console.log('--- CUSTOMER JSON END ---');
        } else {
            console.log('Customer not found or empty results.');
            console.log('Raw response:', JSON.stringify(response.data, null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error('Error fetching customer:', e.message);
        if (e.response) {
            console.error('API Error Response:', JSON.stringify(e.response.data, null, 2));
        }
        process.exit(1);
    }
}

getCustomer();
