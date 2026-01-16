const { query } = require('./config/database');

async function showColumns() {
    try {
        const columns = await query('SHOW COLUMNS FROM products');

        console.log('\n=== Columnas de la tabla products ===\n');
        columns.forEach(c => {
            console.log(`  - ${c.Field} (${c.Type})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

showColumns();
