require('dotenv').config();
const siigoService = require('./services/siigoService');
const axios = require('axios');

// Helper to sanitize object recursively (copied from SiigoService concept)
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
}

async function updateSiigoCustomer() {
    try {
        console.log('Authenticating...');
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        const customerId = '91e29377-e447-4736-af73-6ff39231005f';
        console.log(`Fetching customer ${customerId} data...`);

        // 1. GET current data
        const getResponse = await axios.get(`${baseURL}/v1/customers/${customerId}`, { headers });
        const currentData = getResponse.data;

        console.log('Current Data (Partial):', {
            id: currentData.id,
            name: currentData.name,
            commercial_name: currentData.commercial_name,
            type: currentData.type,
            person_type: currentData.person_type
        });

        // 2. Prepare update payload
        // IMPORTANT: PUT usually requires the full object structure or at least mandatory fields.
        // We will copy currentData and add commercial_name.
        // We need to be careful not to send read-only fields like 'metadata', 'id', etc if the API rejects them. 
        // Typically safe to send back what we got, minus metadata.

        const payload = { ...currentData };
        delete payload.metadata;
        delete payload.id; // Usually ID is in URL, not body? Or optional. Let's remove to be safe or keep if PUT expects it.
        // Getting 400 if ID is present is possible. Let's try removing ID first.
        delete payload.created_at; // cleanup if any

        // Set the new commercial name
        // User requested: "ponle como nombre comercial el nombre" -> "Bontejeans1"
        payload.commercial_name = "Bontejeans1";

        // Also ensure 'name' is correct just in case
        if (!payload.name || (Array.isArray(payload.name) && payload.name.length === 0)) {
            payload.name = ["Bontejeans1"];
        }

        // FIX: id_type comes as object from GET, but PUT expects string code
        if (payload.id_type && typeof payload.id_type === 'object' && payload.id_type.code) {
            payload.id_type = payload.id_type.code;
        }

        console.log('Updating customer with new commercial_name...');

        // 3. PUT request
        const putResponse = await axios.put(`${baseURL}/v1/customers/${customerId}`, payload, { headers });

        console.log('✅ Update Successful!');
        console.log('New Data:', JSON.stringify(putResponse.data, null, 2));

        process.exit(0);

    } catch (e) {
        console.error('❌ Error updating customer:', e.message);
        if (e.response) {
            console.error('API Error Response:', JSON.stringify(e.response.data, null, 2));
        }
        process.exit(1);
    }
}

updateSiigoCustomer();
