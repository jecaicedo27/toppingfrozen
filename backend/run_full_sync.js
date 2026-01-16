require('dotenv').config();
const customerController = require('./controllers/customerController');

// Mock request/response para ejecutar el controlador directamente
const mockReq = {
    query: { max_pages: '250' },
    method: 'POST'
};

const mockRes = {
    json: (data) => {
        console.log('\n🎉 RESULTADO:');
        console.log(JSON.stringify(data, null, 2));
        process.exit(0);
    },
    status: (code) => ({
        json: (data) => {
            console.error('\n❌ ERROR:', code);
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }
    })
};

console.log('🚀 Iniciando importación completa de clientes...');
console.log('⚠️  Este proceso puede tomar 1-2 horas debido al rate limiting de SIIGO\n');

customerController.fullSyncAllCustomers(mockReq, mockRes);
