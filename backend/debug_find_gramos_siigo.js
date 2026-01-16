require('dotenv').config();
const siigoService = require('./services/siigoService');
const axios = require('axios');

async function findGramosProducts() {
    try {
        console.log('Authenticating with SIIGO...');
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        const searchTerm = '1000 gr';
        const foundProducts = [];
        let page = 1;
        const pageSize = 100; // Search chunks
        const maxPages = 20;

        console.log(`Searching for "${searchTerm}" in SIIGO products...`);

        // We'll iterate pages looking for matches
        while (page <= maxPages) {
            try {
                const res = await axios.get(`${baseURL}/v1/products`, {
                    headers,
                    params: { page, page_size: pageSize }
                });

                const results = res.data.results || [];
                if (results.length === 0) break;

                // Filter in memory
                results.forEach(p => {
                    const name = p.name || p.description || '';
                    if (name.toLowerCase().includes(searchTerm.toLowerCase())) {
                        console.log(`FOUND: Name: ${name} | Code: ${p.code} | ID: ${p.id}`);
                        foundProducts.push(p);
                    }
                });

                if (results.length < pageSize) break;
                page++;

                await new Promise(r => setTimeout(r, 200));

            } catch (pageError) {
                console.error(`Error on page ${page}:`, pageError.message);
                if (pageError.response?.status === 429) {
                    console.log('Rate limit, waiting 5s...');
                    await new Promise(r => setTimeout(r, 5000));
                    // Don't retry manually here to keep script simple, just proceed or re-loop could be better but let's keep it linear for debug
                }
                // Try next page if one fails? usually better to stop or simplistic retry
                page++;
            }
        }

        console.log(`\nSearch complete. Found ${foundProducts.length} products with "gramos".`);

    } catch (e) {
        console.error('Fatal Script Error:', e);
    }
}

findGramosProducts();
