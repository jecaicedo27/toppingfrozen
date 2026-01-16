
// Mock of extractFlavor from InventoryManagementPage.js
const extractFlavor = (productName, subgroupContext = '') => {
    const upperName = productName.toUpperCase();
    const normalized = upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    if (normalized.includes('LIMA LIMON') || normalized.includes('LIMA-LIMON') || normalized.includes('LIMA/LIMON')) {
        return 'LIMA LIMON';
    }

    if (normalized.includes('CHOCOLATE') && (normalized.includes('AVELLANA') || normalized.includes('AVELLANAS'))) {
        return 'CHOCOLATE AVELLANA';
    }

    if (normalized.includes('CHOCOLATE') && (normalized.includes('SUIZO') || normalized.includes('ZUIZO'))) {
        return 'CHOCOLATE SUIZO';
    }

    // Regla específica: AZUCAR MARACUYA
    if (normalized.includes('AZUCAR') && normalized.includes('MARACUYA')) {
        return 'AZUCAR MARACUYA';
    }

    // ... skipping irrelevant specific rules ...

    // Regla específica para CHOCOLATE, GIRASOL, LENTEJUELAS, CHICLE en TOPPINGS o todo el subgrupo TOPPINGS DULCE, TOPPING GOMAS y TOPPING IMPORTADOS
    if (normalized.includes('CHOCOLATE') || normalized.includes('GIRASOL') || normalized.includes('LENTEJUELAS') || normalized.includes('CHICLE') ||
        subgroupContext === 'TOPPINGS DULCE' || subgroupContext === 'TOPPING GOMAS' || subgroupContext === 'TOPPING IMPORTADOS') {
        // Limpiar patrones de peso/unidades
        let cleaned = normalized.replace(/\s+(?:X\s*)?\d+(?:\.\d+)?\s*(?:ML|GRS|GR?|KG|L|G|OZ|UND|UNIDADES)\b/g, '').trim();
        cleaned = cleaned.replace(/\s+\d+$/g, '').trim(); // Numeros sueltos al final

        // Quitar palabras de ruido comunes al inicio si existen
        cleaned = cleaned.replace(/^(TOPPING|SALSA|MEZCLA)\s+/, '');

        // Si el resultado es muy corto (solo CHOCOLATE), retornarlo asi.
        // Si es mas largo (CHOCOLATE BLANCO, CHOCOLATE CORAZONES), devolverlo todo.
        return cleaned;
    }

    return 'STANDARD'; // Fallback for test
};

const testCases = [
    { name: "Chupeta Labios rojos 40 Und", subgroup: "TOPPINGS DULCE" },
    { name: "Chupeta Labios rojos", subgroup: "TOPPINGS DULCE" },
];

testCases.forEach(tc => {
    console.log(`Input: "${tc.name}", Subgroup: "${tc.subgroup}" => Output: "${extractFlavor(tc.name, tc.subgroup)}"`);
});
