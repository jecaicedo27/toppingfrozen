const { pool } = require("./config/database");
const siigoService = require("./services/siigoService");
const axios = require("axios");
require("dotenv").config();

async function run() {
    try {
        console.log("Checking SPE07...");
        const [rows] = await pool.execute("SELECT * FROM products WHERE internal_code = 'SPE07'");
        console.log("SPE07 exists?", rows.length > 0);

        console.log("Loading config...");
        await siigoService.loadConfig();
        const headers = await siigoService.getHeaders();

        console.log("Updating SLE12 by UUID...");
        const uuid = "92234a88-6ca5-4096-b671-c78ff4153ffe"; // UUID de SLE12/SPE07

        const res = await axios.get("https://api.siigo.com/v1/products/" + uuid, { headers });
        const data = res.data;

        console.log("Got data from SIIGO:", data.code, data.name);

        // Execute Update
        const [result] = await pool.execute(
            "UPDATE products SET internal_code = ?, product_name = ?, updated_at = NOW(), last_sync_at = NOW() WHERE siigo_id = ?",
            [data.code, data.name, uuid]
        );

        console.log("Update executed. Changed rows:", result.changedRows);

    } catch (e) {
        console.log("Error:", e.message);
        if (e.response) console.log("Response data:", e.response.data);
    }
    process.exit();
}

run();
