const axios = require('axios');

async function testSiigoInvoices() {
    const baseUrl = 'http://localhost:3001/api/siigo/invoices';

    // Test with enrich=true (Default)
    console.log('--- Testing with enrich=true (Default) ---');
    const startEnrich = Date.now();
    try {
        const resEnrich = await axios.get(baseUrl, {
            params: { page: 1, page_size: 5, enrich: 'true' },
            timeout: 60000
        });
        const durationEnrich = Date.now() - startEnrich;
        console.log(`Status: ${resEnrich.status}`);
        console.log(`Items: ${resEnrich.data.data?.results?.length}`);
        console.log(`Duration: ${durationEnrich}ms`);
    } catch (error) {
        console.error('Error with enrich=true:', error.message);
    }

    console.log('\n--- Testing with enrich=false (Optimization) ---');
    const startNoEnrich = Date.now();
    try {
        const resNoEnrich = await axios.get(baseUrl, {
            params: { page: 1, page_size: 5, enrich: 'false' },
            timeout: 60000
        });
        const durationNoEnrich = Date.now() - startNoEnrich;
        console.log(`Status: ${resNoEnrich.status}`);
        console.log(`Items: ${resNoEnrich.data.data?.results?.length}`);
        console.log(`Duration: ${durationNoEnrich}ms`);

        if (typeof durationEnrich !== 'undefined') {
            console.log(`\nImprovement: ${((durationEnrich - durationNoEnrich) / durationEnrich * 100).toFixed(2)}% faster`);
        }

    } catch (error) {
        console.error('Error with enrich=false:', error.message);
    }
}

testSiigoInvoices();
