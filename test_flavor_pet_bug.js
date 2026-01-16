
// Mock of extractFlavor from InventoryManagementPage.js
const extractFlavor = (productName, subgroupContext = '') => {
    const upperName = productName.toUpperCase();
    const normalized = upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

    // ... (skipping lines 137-172 from original file for brevity, assuming they don't match)

    // Simulating line 173 from InventoryManagementPage.js
    if (normalized.includes('PET')) return 'PET';

    // ...

    return 'STANDARD';
};

const testCases = [
    { name: "Chupeta Labios rojos 40 Und", subgroup: "TOPPINGS DULCE" },
    { name: "CHUPETA", subgroup: "TOPPINGS DULCE" },
    { name: "ENVASE PET", subgroup: "TOPPINGS DULCE" }
];

testCases.forEach(tc => {
    console.log(`Input: "${tc.name}" => Output: "${extractFlavor(tc.name, tc.subgroup)}"`);
});
