const inventorySnapshotService = require('../services/inventorySnapshotService');

async function runSnapshot() {
    console.log('🚀 Ejecutando snapshot manual de inventario...');
    await inventorySnapshotService.captureSnapshot();
    console.log('✅ Snapshot completado. Cerrando...');
    process.exit(0);
}

runSnapshot().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
