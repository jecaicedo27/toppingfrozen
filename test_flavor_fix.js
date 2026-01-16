
// Mock of extractFlavor with the PROPOSED FIXES
const extractFlavor = (productName, subgroupContext = '') => {
    const upperName = productName.toUpperCase();
    const normalized = upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    // --- PROPOSED FIX: Specific Override ---
    if (normalized.includes('CHUPETA') && normalized.includes('LABIOS')) {
        return 'CHUPETAS DE LABIOS ROJOS';
    }

    // ... (skipping other rules) ...

    // --- PROPOSED FIX: PET Regex ---
    // Was: if (normalized.includes('PET')) return 'PET';
    if (/\bPET\b/.test(normalized)) return 'PET';

    // ... (skipping other rules) ...

    return 'STANDARD';
};

const testCases = [
    { name: "Chupeta Labios rojos 40 Und", subgroup: "TOPPINGS DULCE", expected: "CHUPETAS DE LABIOS ROJOS" },
    { name: "CHUPETA", subgroup: "TOPPINGS DULCE", expected: "STANDARD" }, // Should NOT be PET
    { name: "ENVASE PET", subgroup: "TOPPINGS DULCE", expected: "PET" },   // Should be PET
    { name: "BOTELLA PET 500ML", subgroup: "TOPPINGS DULCE", expected: "PET" } // Should be PET
];

console.log("Running verification...");
let failed = false;
testCases.forEach(tc => {
    const output = extractFlavor(tc.name, tc.subgroup);
    const passed = output === tc.expected;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Input: "${tc.name}" => Output: "${output}" (Expected: "${tc.expected}")`);
    if (!passed) failed = true;
});

if (failed) process.exit(1);
