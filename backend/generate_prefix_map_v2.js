const xlsx = require('xlsx');
const filePath = '/var/www/toppingfrozen/clasificacion de inventario.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const prefixMap = {};

    rows.forEach(row => {
        const code = (row['Codigo'] || row['Código'] || row['codigo'] || '').trim().toUpperCase();
        // AQUI ESTA EL CAMBIO CLAVE: Usamos 'Categoria' (Col A) en vez de 'Grupo'
        const category = (row['Categoria'] || row['Categoría'] || '').trim();

        if (code && category) {
            const p3 = code.substring(0, 3);

            // Si el prefijo ya existe, verificamos si cambia (conflicto)
            if (prefixMap[p3] && prefixMap[p3] !== category) {
                // console.log(`Conflict for ${p3}: ${prefixMap[p3]} vs ${category}`);
                // En caso de conflicto, la mayoría gana? O la última?
                // Asumamos consistencia por ahora.
            }
            prefixMap[p3] = category;
        }
    });

    console.log("const PREFIX_TO_CATEGORY = " + JSON.stringify(prefixMap, null, 2) + ";");

} catch (e) {
    console.error(e);
}
