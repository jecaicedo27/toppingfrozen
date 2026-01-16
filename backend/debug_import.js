const completeProductImportService = require('./services/completeProductImportService');

async function run() {
    try {
        console.log("Starting import...");
        const result = await completeProductImportService.importAllProducts();
        console.log("Result:", result);
    } catch (e) {
        console.error("CRITICAL ERROR:", e);
    } finally {
        process.exit();
    }
}

run();
