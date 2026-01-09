require('dotenv').config();
const configService = require('./services/configService');

async function run() {
    try {
        const creds = await configService.getSiigoCredentials();
        console.log('Username in system_config:', creds.username);
        // Sensitive: console.log('AccessKey:', creds.accessKey); 
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        process.exit();
    }
}

run();
