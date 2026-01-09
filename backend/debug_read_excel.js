const xlsx = require('xlsx');
const path = require('path');

const filePath = '/var/www/toppingfrozen/clasificacion de inventario.xlsx';

try {
    console.log(`📖 Leyendo archivo: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convertir a JSON
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log(`📊 Hoja: ${sheetName}`);
    console.log(`🔢 Filas encontradas: ${data.length}`);

    if (data.length > 0) {
        console.log("\n📝 Estructura (Primera fila):");
        console.log(Object.keys(data[0]));

        console.log("\n👀 Muestra (Primeras 5 filas):");
        console.log(JSON.stringify(data.slice(0, 5), null, 2));

        // Análisis de Grupos
        // Asumo que habrá alguna columna de "Grupo" o "Categoría"
        const keys = Object.keys(data[0]);
        // Intento adivinar columnas clave
        const groupCol = keys.find(k => k.toLowerCase().includes('grupo') || k.toLowerCase().includes('categoria') || k.toLowerCase().includes('clasificacion'));

        if (groupCol) {
            const groups = [...new Set(data.map(r => r[groupCol]))];
            console.log(`\n📂 Grupos detectados (${groups.length}):`, groups.slice(0, 10));
        }
    }

} catch (e) {
    console.error("❌ Error leyendo Excel:", e.message);
}
