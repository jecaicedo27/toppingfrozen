
// Mock of extractFlavor with the PROPOSED FIXES
const extractFlavor = (productName, subgroupContext = '') => {
    const upperName = productName.toUpperCase();
    const normalized = upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    // ... previous overrides ...
    if (normalized.includes('CHUPETA') && normalized.includes('LABIOS')) {
        return 'CHUPETAS DE LABIOS ROJOS';
    }

    // --- PROPOSED FIX: Perlas Chicle ---
    // Rule: Identify anything containing "CHICLE" within "PERLAS" context and standardize to "CHICLE"
    if ((normalized.includes('PERLA') || subgroupContext.includes('PERLAS')) && normalized.includes('CHICLE')) {
        return 'CHICLE'; // Corrected return value to align with other flavor columns
    }

    // ... common flavors ...
    if (normalized.includes('CHICLE')) {
        return 'CHICLE';
    }

    return 'STANDARD';
};

const testCases = [
    { name: "PERLAS CHICLE 3000G", subgroup: "PERLAS BUBOLS", expected: "CHICLE" },
    { name: "PERLAS CHICLES 1000G", subgroup: "PERLAS BUBOLS", expected: "CHICLE" },
    { name: "PERLAS EXPLOSIVAS CHICLE", subgroup: "PERLAS BUBOLS", expected: "CHICLE" },
    { name: "PERLAS FRESA", subgroup: "PERLAS BUBOLS", expected: "STANDARD" }
];

console.log("Running perlas verification...");
let failed = false;
testCases.forEach(tc => {
    const output = extractFlavor(tc.name, tc.subgroup);
    const passed = output === tc.expected;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Input: "${tc.name}" => Output: "${output}" (Expected: "${tc.expected}")`);
    if (!passed) failed = true;
});

if (failed) process.exit(1);
