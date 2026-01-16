
// Mock of extractFlavor (current state + previous fixes)
const extractFlavor = (productName, subgroupContext = '') => {
    const upperName = productName.toUpperCase();
    const normalized = upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    // ... previous overrides ...
    if (normalized.includes('CHUPETA') && normalized.includes('LABIOS')) {
        return 'CHUPETAS DE LABIOS ROJOS';
    }

    // ... common flavors ...
    if (normalized.includes('CHICLE')) {
        // Current logic might be partial. 
        // We simulate what it likely does based on the screenshot: returns "PERLAS CHICLE", "PERLAS EXPLOSIVAS CHICLE" etc.
        // If the code doesn't strictly strip "PERLAS" and "EXPLOSIVAS", it returns them.

        // Simulating the issue:
        // Attempt to clean weight units:
        let cleaned = normalized.replace(/\s+(?:X\s*)?\d+(?:\.\d+)?\s*(?:ML|GRS|GR?|KG|L|G|OZ|UND|UNIDADES)\b/g, '').trim();
        cleaned = cleaned.replace(/\s+\d+$/g, '').trim();

        // Return cleaned name which likely still has "PERLAS"
        return cleaned;
    }

    return 'STANDARD';
};

const testCases = [
    { name: "PERLAS CHICLE 3000G", subgroup: "PERLAS BUBOLS" },
    { name: "PERLAS CHICLES 1000G", subgroup: "PERLAS BUBOLS" },
    { name: "PERLAS EXPLOSIVAS CHICLE", subgroup: "PERLAS BUBOLS" }
];

console.log("Current Behavior:");
testCases.forEach(tc => {
    console.log(`Input: "${tc.name}" => Output: "${extractFlavor(tc.name, tc.subgroup)}"`);
});
