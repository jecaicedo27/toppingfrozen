const xlsx = require('xlsx');
const filePath = '/var/www/toppingfrozen/clasificacion de inventario.xlsx';

function getPrefix(code) {
    if (!code) return '';
    // Extraer letras iniciales (ej. ASM03 -> ASM, GAC02 -> GAC)
    const match = code.match(/^([A-Z]+)/);
    return match ? match[1] : '';
}

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const prefixMap = {};
    const groupSet = new Set();

    rows.forEach(row => {
        const code = (row['Codigo'] || row['Código'] || row['codigo'] || '').trim().toUpperCase();
        const group = (row['Grupo'] || row['Categoria'] || row['Categoría'] || '').trim();

        if (code && group) {
            // Intentar prefijos de 2 y 3 letras
            const p2 = code.substring(0, 2);
            const p3 = code.substring(0, 3);

            // Prioridad a 3 letras, pero guardamos tendencias
            if (!prefixMap[p3]) prefixMap[p3] = new Set();
            prefixMap[p3].add(group);

            groupSet.add(group);
        }
    });

    console.log("CONSTANTS FROM EXCEL:");
    console.log("const EXCEL_GROUPS = " + JSON.stringify([...groupSet]) + ";");

    // Simplificar mapa: Si un prefijo apunta siempre al mismo grupo, es una regla sólida.
    const ruleMap = {};
    Object.keys(prefixMap).forEach(p => {
        const groups = [...prefixMap[p]];
        if (groups.length === 1) {
            ruleMap[p] = groups[0];
        } else {
            // Conflicto de prefijos (ej. tal vez 'ME' apunta a muchos).
            // console.log(`Conflict for prefix ${p}:`, groups);
        }
    });

    console.log("\nconst PREFIX_TO_GROUP = " + JSON.stringify(ruleMap, null, 2) + ";");

} catch (e) {
    console.error(e);
}
