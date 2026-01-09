require('dotenv').config();
const axios = require('axios');
const siigoService = require('./services/siigoService');
const { pool } = require('./config/database');

async function checkTOF15() {
    try {
        console.log('Authenticating...');
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        console.log('Fetching product TOF15 from Siigo...');

        // 1. Try Direct Search by Code (Available in some API versions)
        try {
            const res = await axios.get(`${baseURL}/v1/products?code=TOF15`, { headers });
            if (res.data.results && res.data.results.length > 0) {
                const p = res.data.results[0];
                console.log(`\n✅ FOUND in Siigo (via code search):`);
                console.log(`Name: "${p.name}"`);
                console.log(`Code: ${p.code}`);
                console.log(`Active: ${p.active}`);
                console.log(`ID: ${p.id}`);
                process.exit(0);
            }
        } catch (e) {
            // Ignore and try fallback
        }

        // 2. Fallback: Resolve ID from local DB
        console.log('Direct search yielded nothing. Checking local DB for ID...');
        const [rows] = await pool.execute('SELECT siigo_product_id FROM products WHERE internal_code = "TOF15"');

        if (rows.length > 0 && rows[0].siigo_product_id) {
            const id = rows[0].siigo_product_id;
            console.log(`Found local ID: ${id}. Fetching direct from Siigo...`);

            try {
                const res2 = await axios.get(`${baseURL}/v1/products/${id}`, { headers });
                const p = res2.data;
                console.log(`\n✅ FOUND in Siigo (via ID lookup):`);
                console.log(`Name: "${p.name}"`);
                console.log(`Code: ${p.code}`);
                console.log(`Active: ${p.active}`);
            } catch (errApi) {
                console.error('Error fetching by ID:', errApi.message);
            }
        } else {
            console.log('Product TOF15 not found locally or in Siigo.');
        }

        process.exit(0);

    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

checkTOF15();
