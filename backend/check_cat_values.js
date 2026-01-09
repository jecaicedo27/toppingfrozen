const { query } = require('./config/database');

async function checkCategoryValues() {
    try {
        console.log('\n=== Resumen de Productos por Categoría ===\n');

        const rows = await query(`
            SELECT 
                IFNULL(category, 'SIN CATEGORIA') as cat, 
                COUNT(*) as count,
                SUM(stock) as total_stock,
                SUM(stock * standard_price) as total_value
            FROM products 
            GROUP BY cat
            ORDER BY cat
        `);

        rows.forEach(r => {
            console.log(`${r.cat.padEnd(25)} | Cantidad: ${String(r.count).padStart(3)} | Stock Total: ${String(r.total_stock || 0).padStart(6)} | Valor Total: $${(r.total_value || 0).toLocaleString()}`);
        });

        const totalRow = await query(`SELECT SUM(stock * standard_price) as total FROM products`);
        console.log(`\nValor Total General en DB: $${(totalRow[0].total || 0).toLocaleString()}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCategoryValues();
