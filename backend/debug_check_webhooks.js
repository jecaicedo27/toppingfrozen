const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const { query, pool } = require('./config/database');

async function checkWebhooks() {
    try {
        console.log('🔍 Checking Siigo Credentials...');

        let username = process.env.SIIGO_API_USERNAME;
        let accessKey = process.env.SIIGO_API_ACCESS_KEY;
        const baseUrl = 'https://api.siigo.com';

        // Try to get from DB if missing
        if (!username || !accessKey) {
            const [rows] = await pool.execute('SELECT siigo_username, siigo_access_key FROM siigo_credentials WHERE company_id = 1 LIMIT 1');
            if (rows.length > 0) {
                username = rows[0].siigo_username;
                accessKey = rows[0].siigo_access_key;
                // Handle encryption if needed (simplified check)
                try {
                    const parsed = JSON.parse(accessKey);
                    if (parsed.encrypted) {
                        console.log('⚠️ Access key is encrypted in DB, cannot decrypt without configService logic. Using env vars or raw if possible.');
                    }
                } catch (e) { }
            }
        }

        if (!username || !accessKey) {
            console.error('❌ Missing credentials');
            process.exit(1);
        }

        console.log('🔐 Authenticating with username:', username);
        const authResp = await axios.post(`${baseUrl}/auth`, {
            username: username,
            access_key: accessKey
        });

        const token = authResp.data.access_token;
        console.log('✅ Authenticated. checking webhooks...');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Partner-Id': 'siigo'
        };

        const hooksResp = await axios.get(`${baseUrl}/v1/webhooks`, { headers });
        console.log('📋 Active Webhooks on Siigo:');
        console.log(JSON.stringify(hooksResp.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    } finally {
        process.exit();
    }
}

checkWebhooks();
