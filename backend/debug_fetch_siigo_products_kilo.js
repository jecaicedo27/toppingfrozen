require('dotenv').config();
const siigoService = require('./services/siigoService');
const axios = require('axios');

async function fetchKiloProductsDirectly() {
    try {
        console.log('Authenticating with SIIGO...');
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();
        const baseURL = siigoService.baseURL || 'https://api.siigo.com';

        const searchTerm = 'kilo';
        const foundProducts = [];
        let page = 1;
        const pageSize = 100;
        let hasMore = true;
        const maxPages = 20; // Limit to 20 pages to avoid long waits (assuming catalog < 2000 items or sufficient for search)

        console.log(`Searching for "${searchTerm}" in SIIGO products (Max ${maxPages} pages)...`);

        while (hasMore && page <= maxPages) {
            console.log(`Fetching page ${page}...`);

            // Fetch page
            // Note: SIIGO might support ?name= or ?description= filtering but documented support matches by code or generic search.
            // We will fetch pages and filter in memory to be sure.
            try {
                const res = await axios.get(`${baseURL}/v1/products`, {
                    headers,
                    params: { page, page_size: pageSize }
                });

                const results = res.data.results || [];
                const pagination = res.data.pagination || {};

                if (results.length === 0) {
                    hasMore = false;
                    break;
                }

                // Filter in memory
                results.forEach(p => {
                    const name = p.name || p.description || '';
                    if (name.toLowerCase().includes(searchTerm.toLowerCase())) {
                        const status = p.active ? 'ACTIVO' : 'INACTIVO';
                        const code = (p.code || 'N/A');

                        const entry = {
                            name: name,
                            code: p.code,
                            active: p.active
                        };
                        foundProducts.push(entry);

                        // Log immediately to capture partial data
                        console.log(`FOUND: [${status}] Name: ${name} | Code: ${code}`);
                    }
                });

                // Check active filter (if user cared, but request was just "list them and their status")

                // Pagination check
                if (pagination.total_pages && page >= pagination.total_pages) {
                    hasMore = false;
                } else if (!pagination.total_pages && results.length < pageSize) {
                    // heuristic if total_pages missing
                    hasMore = false;
                }

                page++;

                // Friendly rate limit wait
                await new Promise(r => setTimeout(r, 200));

            } catch (pageError) {
                console.error(`Error fetching page ${page}:`, pageError.message);
                // If rate limit, wait longer
                if (pageError.response?.status === 429) {
                    console.log('Rate limit hit, waiting 5s...');
                    await new Promise(r => setTimeout(r, 5000));
                    // Retry same page? For simplicity, we skip or could implement retry. 
                    // Let's decrement page to retry.
                    page--;
                } else {
                    // Other error, break or continue?
                    break;
                }
            }
        }

        console.log(`\nFound ${foundProducts.length} products with "kilo" in SIIGO:\n`);

        // Output table format
        console.log('STATUS    | CODE      | NAME');
        console.log('----------|-----------|--------------------------------------------------');
        foundProducts.forEach(p => {
            const status = p.active ? 'ACTIVO' : 'INACTIVO';
            // Pad status for alignment
            const statusPad = status.padEnd(9, ' ');
            const codePad = (p.code || 'N/A').padEnd(9, ' ');
            console.log(`${statusPad} | ${codePad} | ${p.name}`);
        });

        process.exit(0);

    } catch (e) {
        console.error('Fatal Script Error:', e);
        process.exit(1);
    }
}

fetchKiloProductsDirectly();
