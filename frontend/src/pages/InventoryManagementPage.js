import React, { useEffect, useState, useRef } from 'react';
import { Package, RefreshCw, Save, TrendingUp, Filter, Search, X, FileText } from 'lucide-react';
import inventoryManagementService from '../services/inventoryManagementService';
import InventoryDashboard from '../components/InventoryDashboard';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const InventoryManagementPage = () => {
    const { user, hasPermission } = useAuth();
    const showFinancials = hasPermission(['admin', 'cartera']);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para matriz
    const [groupedProducts, setGroupedProducts] = useState({});
    const [categories, setCategories] = useState([]);

    // Estados para filtros y búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [abcFilter, setAbcFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState(''); // Nuevo filtro de proveedor

    // Estados para análisis y modal
    const [analyzing, setAnalyzing] = useState(false);
    const [coverageDays, setCoverageDays] = useState(15);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []); // Carga inicial

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await inventoryManagementService.getView();
            console.log('📦 Inventory Data Received:', response); // DEBUG

            let data = [];
            if (response.success && Array.isArray(response.data)) {
                data = response.data;
            } else if (Array.isArray(response)) {
                data = response;
            } else {
                console.error('Formato de datos inesperado:', response);
                setError('Error: Formato de datos incorrecto');
                setLoading(false);
                return;
            }

            setProducts(data);
            organizeProductsForInventory(data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setError('Error cargando inventario');
            setLoading(false);
        }
    };

    // Obtener lista única de proveedores para el filtro
    const uniqueSuppliers = [...new Set(products.map(p => p.supplier).filter(Boolean))].sort();

    // --- HELPER FUNCTIONS (Adaptadas de InventoryBillingPage) ---

    const extractPresentation = (productName, productCode) => {
        // Lógica Especial: Productos MEL (leches) van en fila aparte "LECHE"
        // Lógica Especial: Productos MEL (leches) van en fila aparte "LECHE"
        if ((productCode && String(productCode).toUpperCase().startsWith('MEL')) || String(productName || '').toUpperCase().includes('LECHE')) {
            return 'LECHE (MEZCLA B)';
        }

        const normalized = productName.toUpperCase().replace(/\s+/g, ' ');

        // Regla explícita para LIBRA
        if (normalized.includes('LIBRA')) {
            return 'LIBRA';
        }

        let match = normalized.match(/(?:\bX\b\s*)?(\d+(?:\.\d+)?)\s*(ML|GR?|KG|L|G|OZ)\b/i);
        if (!match) {
            match = normalized.match(/(\d+(?:\.\d+)?)\s*(ML|GR?|KG|L|G|OZ)\b/i);
        }

        if (match) {
            let value = match[1];
            const unitToken = match[2].toUpperCase();
            let unit = 'G';
            if (unitToken === 'ML' || unitToken === 'L' || normalized.includes('ML') || normalized.includes('SIROPE') || normalized.includes('LIQUIDO')) {
                unit = 'ML';
            } else if (unitToken === 'OZ') {
                unit = 'OZ';
            }

            if (unitToken === 'L') {
                const n = parseFloat(value);
                if (!Number.isNaN(n)) value = String(Math.round(n * 1000));
            }

            if (value === '250') return unit === 'ML' ? '250ML' : '250G';
            // Unificación: 330 -> 350 para consolidar presentaciones comerciales similares
            if (value === '330') return unit === 'ML' ? '350ML' : '350G';
            if (value === '350') return unit === 'ML' ? '350ML' : '350G';
            if (value === '360') return unit === 'ML' ? '360ML' : '360G';
            if (value === '500') return unit === 'ML' ? '500ML' : '500G';
            if (value === '1000') return unit === 'ML' ? '1000ML' : '1000G';
            if (value === '1100') return unit === 'ML' ? '1100ML' : '1100G';
            if (value === '1150') return unit === 'ML' ? '1150ML' : '1150G';
            if (value === '2300') return unit === 'ML' ? '2300ML' : '2300G';
            if (value === '3400') return unit === 'ML' ? '3400ML' : '3400G';

            return `${value}${unit}`;
        }

        const aux = normalized.match(/\b(250|500|750|1000|1200)\b/);
        if (aux && (normalized.includes('SIROPE') || normalized.includes('LIQUIDO'))) {
            return `${aux[1]}ML`;
        }

        return 'STANDARD';
    };

    const extractFlavor = (productName) => {
        const upperName = productName.toUpperCase();
        const normalized = upperName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

        if (normalized.includes('LIMA LIMON') || normalized.includes('LIMA-LIMON') || normalized.includes('LIMA/LIMON')) {
            return 'LIMA LIMON';
        }

        // Regla específica: AZUCAR MARACUYA
        if (normalized.includes('AZUCAR') && normalized.includes('MARACUYA')) {
            return 'AZUCAR MARACUYA';
        }

        // Regla específica para MATERIAL DE EMPAQUE (Diferenciadores Clave)
        // Regla específica para MATERIAL DE EMPAQUE (Diferenciadores Clave)
        if (normalized.includes('TAPA')) {
            if (normalized.includes('GOLD')) return 'TAPA GOLD';
            if (normalized.includes('DOMO')) return 'TAPA CONTENEDOR';
            if (normalized.includes('PLANA')) return 'TAPA PLANA';
            if (normalized.includes('EASY OPEN')) return 'EASY OPEN';
            if (normalized.includes('ALUMINIO')) return 'ALUMINIO';
            if (normalized.includes('CUADRADA')) return 'CUADRADA';
            if (normalized.includes('SILICONA')) return 'SILICONA';
            if (normalized.includes('NEGRA')) return 'TAPA NEGRA';
            if (normalized.includes('BLANCA')) return 'TAPA BLANCA';
            return 'TAPA BOWL';
        }
        if (normalized.includes('CUBETA')) return 'CUBETA';
        if (normalized.includes('BOWL')) return 'BOWL';
        if (normalized.includes('DIGITAL')) return 'DIGITAL';
        if (normalized.includes('LOGO PROPIO') || normalized.includes('PROPIO')) return 'PROPIO';
        if (normalized.includes('BLANCO')) return 'BLANCO';
        if (normalized.includes('PET')) return 'PET';
        if (normalized.includes('PP') && !normalized.includes('TOPF')) return 'PP'; // Evitar TOPF si es marca

        // Regla específica para LECHE: Separar por tipo antes de agrupar por ALULOSA
        if (normalized.includes('LECHE')) {
            let tipo = '';
            if (normalized.includes('SUAVE')) tipo = 'SUAVE';
            else if (normalized.includes('YOGURT')) tipo = 'YOGURT';
            else if (normalized.includes('PREMIUM')) tipo = 'PREMIUM';
            else if (normalized.includes('GELATO')) tipo = 'GELATO';
            else if (normalized.includes('FROZZEN')) tipo = 'FROZZEN';

            if (tipo) {
                // Si tiene alulosa, agregamos el sufijo para diferenciar
                if (normalized.includes('ALULOSA')) {
                    return `${tipo} ALULOSA`;
                }
                return tipo;
            }
        }

        // Regla específica para MEZCLAS con VAINILLA: Separar variantes específicas
        if ((normalized.includes('MEZCLA') || normalized.includes('MALTEADA')) &&
            (normalized.includes('VAINILLA') || normalized.includes('VANILLA'))) {

            // Detectar variantes específicas primero
            if (normalized.includes('FRANCESA')) return 'VAINILLA FRANCESA';
            if (normalized.includes('AMERICANA')) return 'VAINILLA AMERICANA';
            if (normalized.includes('DESCREMADA')) return 'VAINILLA DESCREMADA';
            if (normalized.includes('NARANJA')) return 'VAINILLA NARANJA';
            if (normalized.includes('GELATO')) return 'VAINILLA GELATO';
            if (normalized.includes('ALULOSA')) return 'VAINILLA ALULOSA';

            // Si no tiene variante específica, retornar VAINILLA normal
            return 'VAINILLA';
        }

        const commonFlavors = [
            'BLUEBERRY', 'CAFE', 'CEREZA', 'CHAMOY', 'CHICLE', 'COCO', 'FRESA',
            'ICE PINK', 'LYCHE', 'MANGO BICHE CON SAL', 'MANGO BICHE', 'MANZANA VERDE',
            'MARACUYA', 'SANDIA', 'VAINILLA', 'VANILLA', 'UVA', 'LIMA LIMON', 'LIMON',
            'NARANJA', 'PIÑA', 'MENTA', 'CHOCOLATE', 'GOMITAS', 'GOMITA', 'MANZANA'
        ];

        for (const flavor of commonFlavors) {
            if (normalized.includes(flavor)) {
                if (flavor === 'GOMITA') return 'GOMITAS';
                if (flavor === 'MANZANA') return 'MANZANA VERDE';
                if (flavor === 'VANILLA') return 'VAINILLA';
                if (flavor === 'LIMON' && !normalized.includes('LIMA')) return 'LIMA LIMON';
                if (flavor === 'MANGO BICHE' && !normalized.includes('SAL')) return 'MANGO BICHE';
                return flavor;
            }
        }

        // Regla específica para PITILLOS: Extraer dimensión (ej: 7 MM)
        if (normalized.includes('PITILLO')) {
            const pitilloMatch = normalized.match(/(\d+)\s*MM/);
            if (pitilloMatch) {
                return `PITILLOS ${pitilloMatch[1]} MM`;
            }
            return 'PITILLOS';
        }

        const m = normalized.match(/SABOR(?:\s+A)?\s+([A-ZÁÉÍÓÚÑ ]+?)(?:\s+X\s*\d|$)/);
        if (m && m[1]) return m[1].trim();

        // Limpieza mejorada: Remover patrones de peso con o sin "X"
        // Ej: " X 500ML", " 1100GR", " 300G"
        let cleaned = normalized.replace(/\s+(?:X\s*)?\d+(?:\.\d+)?\s*(?:ML|GR?|KG|L|G|OZ)\b/g, '').trim();

        // Si después de limpieza quedan solo números al final, quitarlos (ej: "SABOR 1100")
        cleaned = cleaned.replace(/\s+\d+$/g, '').trim();

        const words = cleaned.split(/\s+/);
        let candidate = words[words.length - 1] || 'CLASICO';
        const unitTokens = new Set(['ML', 'GR', 'G', 'KG', 'L', 'OZ', 'X']);
        if (unitTokens.has(candidate)) candidate = words[words.length - 2] || 'CLASICO';

        if (candidate === 'GOMITA') return 'GOMITAS';
        if (candidate === 'MANZANA') return 'MANZANA VERDE';
        if (candidate === 'MM') return 'PITILLOS'; // Fallback por si acaso
        if (candidate === 'UNI') return 'TOPF NATURAL';

        return candidate;
    };

    const pickFlavor = (product) => {
        try {
            const sub = String(product?.subcategory || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
            if (sub) {
                if (sub.includes('LIMA LIMON') || sub.includes('LIMA-LIMON') || sub.includes('LIMA/LIMON')) return 'LIMA LIMON';
                return sub;
            }
        } catch (_) { }
        return extractFlavor(product?.name || '');
    };

    const organizeProductsForInventory = (productsList) => {
        const grouped = {};
        const cats = new Set(); // Guardará los GRUPOS (Nivel 1)
        let skippedCount = 0;

        console.log(`🧩 Organizing ${productsList.length} products (Improved V2)...`);

        productsList.forEach(product => {
            if (!product.name) {
                skippedCount++;
                return;
            }

            // 1. Obtener Grupo y Subgrupo desde BD (Ahora usamos las columnas estándar)
            let group = (product.category || 'SIN CLASIFICAR').toUpperCase().trim();
            let subgroup = (product.subcategory || 'GENERAL').toUpperCase().trim();

            // 2. Filtros
            if (abcFilter && product.abc_classification !== abcFilter) return;
            if (supplierFilter && product.supplier !== supplierFilter) return;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const match = product.name.toLowerCase().includes(term) ||
                    product.internal_code?.toLowerCase().includes(term) ||
                    product.barcode?.toLowerCase().includes(term) ||
                    group.toLowerCase().includes(term) ||
                    subgroup.toLowerCase().includes(term);
                if (!match) return;
            }

            // 3. Extracción de Dimensiones para la Matriz
            const presentation = extractPresentation(product.name, product.internal_code);

            // Para el "Sabor" (Columna), usamos el nombre simplificado o el internal_code para unicidad si es necesario
            let flavor = extractFlavor(product.name);

            // Estructura Anidada: Grupo -> Subgrupo -> Presentación -> Sabor -> Producto
            if (!grouped[group]) grouped[group] = {};
            if (!grouped[group][subgroup]) grouped[group][subgroup] = {};
            if (!grouped[group][subgroup][presentation]) grouped[group][subgroup][presentation] = {};

            // COLLISION HANDLING: Si la celda ya está ocupada por OTRO producto, intentar hacer el Sabor Único
            // Usamos internal_code para verificar si es el mismo producto (no debería pasar, pero por seguridad)
            if (grouped[group][subgroup][presentation][flavor] &&
                grouped[group][subgroup][presentation][flavor].internal_code !== product.internal_code) {

                // Existe colisión con otro producto.
                // Opción: Agregar sufijo para diferenciar
                let i = 2;
                let newFlavor = `${flavor} (${i})`;
                while (grouped[group][subgroup][presentation][newFlavor]) {
                    i++;
                    newFlavor = `${flavor} (${i})`;
                }
                flavor = newFlavor;
            }

            grouped[group][subgroup][presentation][flavor] = product;
            cats.add(group);

        });

        // 4. INYECCIÓN DE LECHES (MELCODES) EN SUBGRUPOS ESPECÍFICOS
        const MILK_MAPPING = {
            'MEL01': ['HELADO SUAVE'],
            'MEL02': ['HELADO YOGURT', 'YOGURT FROZEN'],
            'MEL03': ['HELADO PREMIUM'],
            'MEL06': ['YOGURT SIN AZUCAR', 'YOGURT GRIEGO'],
            'MEL07': ['SUAVE SIN AZUCAR']
        };

        productsList.forEach(product => {
            if (!product.internal_code || !product.internal_code.startsWith('MEL')) return;

            const targetSubgroups = MILK_MAPPING[product.internal_code];
            if (!targetSubgroups) return;

            targetSubgroups.forEach(targetSubgroup => {
                // Buscar en todos los grupos si existe este subgrupo
                Object.keys(grouped).forEach(groupName => {
                    if (grouped[groupName][targetSubgroup]) {
                        // Inyectar la leche
                        const milkPres = 'LECHE BASE';
                        const milkFlavor = `LECHE (${product.internal_code})`; // Nombre para que sea único

                        if (!grouped[groupName][targetSubgroup][milkPres]) {
                            grouped[groupName][targetSubgroup][milkPres] = {};
                        }

                        // Solo inyectar si no existe ya para evitar duplicados visuales confusos
                        if (!grouped[groupName][targetSubgroup][milkPres][milkFlavor]) {
                            grouped[groupName][targetSubgroup][milkPres][milkFlavor] = product;
                        }
                    }
                });
            });
        });

        console.log(`✅ Organization complete. Groups found: ${cats.size}`);
        setGroupedProducts(grouped);
        setCategories([...cats].sort());
    };

    // Re-organizar cuando cambian filtros
    useEffect(() => {
        if (products.length > 0) {
            organizeProductsForInventory(products);
        }
    }, [searchTerm, abcFilter, supplierFilter, products]);

    const getPresentationSortKey = (p) => {
        const pres = (p || '').toUpperCase();
        let group = 2;
        let value = Number.MAX_SAFE_INTEGER;

        if (pres.includes('LECHE BASE')) { group = -1; }
        else if (pres.endsWith('KG')) { group = 0; value = (parseFloat(pres) || 0) * 1000; }
        else if (pres.endsWith('G')) { group = 0; value = parseFloat(pres) || 0; }
        else if (pres.endsWith('L')) { group = 1; value = (parseFloat(pres) || 0) * 1000; }
        else if (pres.endsWith('ML')) { group = 1; value = parseFloat(pres) || 0; }
        else if (pres.endsWith('OZ')) { group = 1; value = parseFloat(pres) || 0; }
        else if (pres === 'STANDARD' || pres === 'STD') { group = 3; }

        return { group, value };
    };

    const comparePresentations = (a, b) => {
        const ka = getPresentationSortKey(a);
        const kb = getPresentationSortKey(b);
        if (ka.group !== kb.group) return ka.group - kb.group;
        return ka.value - kb.value;
    };

    const isSkarchaCategoryName = (name) => {
        const n = String(name || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        return /^(SKARCHA\s+NO\s+FABRICADOS\s+19%)$/.test(n);
    };

    const getFlavorGroupFromData = (categoryData, flavor, category) => {
        const candidates = [];
        Object.values(categoryData).forEach(pres => {
            const prod = pres[flavor];
            if (prod) candidates.push(prod);
        });

        const detect = (t) => {
            t = String(t || '').toUpperCase();
            if (t.includes('CHAMOY')) return 'CHAMOY';
            if (t.includes('SKARCHALITO')) return 'SKARCHALITO';
            if (['AZUCAR', 'AZUCARES'].some(k => t.includes(k))) return 'AZUCARES';
            if (['AJI', 'SAL', 'TAJIN', 'PICANTE'].some(k => t.includes(k))) return 'SALES';
            return null;
        };

        for (const p of candidates) {
            const g = detect(p.name || flavor);
            if (g) return g;
        }

        if ((candidates.length > 0) && (String(category || '').toUpperCase().includes('SKARCHA'))) {
            return 'AZUCARES';
        }
        return 'OTROS';
    };

    const computeOrderedFlavorsWithDividers = (categoryData, category) => {
        const flavorsSet = new Set();
        Object.values(categoryData).forEach(pres => Object.keys(pres).forEach(fl => flavorsSet.add(fl)));

        const groups = { SALES: [], AZUCARES: [], CHAMOY: [], SKARCHALITO: [], OTROS: [] };
        Array.from(flavorsSet).forEach(fl => {
            const g = getFlavorGroupFromData(categoryData, fl, category);
            (groups[g] || groups.OTROS).push(fl);
        });

        Object.keys(groups).forEach(k => groups[k].sort());

        // Ajuste LIMA LIMON
        const az = groups['AZUCARES'];
        const idxLL = az.indexOf('LIMA LIMON');
        if (idxLL !== -1) {
            az.splice(idxLL, 1);
            const idxS = az.indexOf('SANDIA');
            if (idxS !== -1) az.splice(idxS + 1, 0, 'LIMA LIMON');
            else az.push('LIMA LIMON');
        }

        const result = [];
        ['SALES', 'AZUCARES', 'CHAMOY', 'SKARCHALITO', 'OTROS'].forEach(k => {
            if (groups[k].length > 0) {
                if (result.length > 0) result.push('__DIVIDER__');
                result.push(...groups[k]);
            }
        });
        return result;
    };

    const getFlavorIcon = (flavor) => {
        const f = String(flavor).toUpperCase();
        if (f.includes('FRESA')) return '🍓';
        if (f.includes('MANZANA')) return '🍏';
        if (f.includes('SANDIA')) return '🍉';
        if (f.includes('MARACUYA')) return '🍈';
        if (f.includes('UVA')) return '🍇';
        if (f.includes('PIÑA')) return '🍍';
        if (f.includes('COCO')) return '🥥';
        if (f.includes('CEREZA')) return '🍒';
        if (f.includes('LIMON')) return '🍋';
        if (f.includes('NARANJA')) return '🍊';
        if (f.includes('BLUEBERRY') || f.includes('MORA')) return '🫐';
        if (f.includes('DURAZNO')) return '🍑';
        if (f.includes('MANGO')) return '🥭';
        if (f.includes('KIWI')) return '🥝';
        if (f.includes('MENTA')) return '🌿';
        if (f.includes('CHOCOLATE')) return '🍫';
        if (f.includes('VAINILLA')) return '🍦';
        if (f.includes('CAFE')) return '☕';
        if (f.includes('CHICLE')) return '🍬';
        if (f.includes('GOMITA') || f.includes('GOMI')) return '🍬';
        if (f.includes('CHOCOLATE')) return '🍫';
        if (f.includes('NUEZ') || f.includes('MANI') || f.includes('FRUTO SECO') || f.includes('PISTACHO') || f.includes('ARANDANO')) return '🥜';
        if (f.includes('SAL')) return '🧂';
        if (f.includes('PITILLO')) return '🥤';
        if (f.includes('TAPA')) return '🔘';
        return '';
    };

    const formatFlavorLabel = (flavor, category) => {
        if (!flavor) return '';
        const f = String(flavor).toUpperCase();
        const cat = String(category || '').toUpperCase();

        // if (f === 'MM') return 'PITILLOS'; // YA NO ES NECESARIO con la nueva extracción
        if (f.includes('OZ-2') || f.includes('2 OZ')) return 'COPAS MEDIDORAS';
        if (f === 'COPAS') return 'BORDEADOR DE COPAS';
        if (f === 'COCTELERA') return 'CUCHARA COCTELERA';
        if (f === 'ESCARCHADOR') return 'JARABE ESCARCHADOR';
        if (f === 'ESTANDARIZADA') return 'LIQUIMON';

        // Reglas específicas para "Productos No fabricados 19%"
        if (cat.includes('PRODUCTOS NO FABRICADOS')) {
            if (f === 'OSITOS') return 'GUDGUMI OSITOS';
            if (f === 'SANDIA') return 'GUDGUMI SANDIA';
            if (f === 'MARACUYA') return 'GUDGUMI MARACUYA';
            if (f === '16') return 'VASOS 16 OZ';
            if (f === '22') return 'VASOS 22 OZ';
            if (f === 'NARANJA') return 'NARANJA DESHIDRATADA';
        }

        // Reglas específicas para "SKARCHA NO FABRICADOS 19%"
        if (cat.includes('SKARCHA NO FABRICADOS')) {
            if (f === '16') return 'VASOS 16 OZ';
            if (f === '22') return 'VASOS 22 OZ';
            if (f === 'NARANJA') return 'NARANJA DESHIDRATADA';
        }

        if (cat.includes('MEZCLA') && f === 'PP') return 'MEZCLA WAFFLES';

        return flavor;
    };

    // --- LOGIC FOR UPDATING & ANALYZING ---

    const handleUpdateConfig = async (productId, config) => {
        try {
            await inventoryManagementService.updateProductConfig(productId, config);
            toast.success('Configuración actualizada');
            fetchInventory(); // Recargar para ver cambios
        } catch (error) {
            console.error('Error updating config:', error);
            toast.error('Error actualizando configuración');
        }
    };

    const handleAnalyzeConsumption = async () => {
        try {
            setAnalyzing(true);
            toast.loading('Analizando consumo...', { id: 'analyze' });
            const response = await inventoryManagementService.analyzeConsumption({ days: coverageDays });
            if (response.success) {
                toast.success(response.message, { id: 'analyze' });
                await fetchInventory();
            } else {
                toast.error(response.message || 'Error analizando consumo', { id: 'analyze' });
            }
        } catch (error) {
            console.error('Error analyzing consumption:', error);
            toast.error('Error al analizar consumo', { id: 'analyze' });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleCalculateABC = async () => {
        try {
            setAnalyzing(true);
            toast.loading('Calculando clasificación ABC...', { id: 'abc' });
            const response = await inventoryManagementService.calculateABC();
            if (response.success) {
                toast.success(response.message, { id: 'abc' });
                await fetchInventory();
            } else {
                toast.error(response.message || 'Error calculando ABC', { id: 'abc' });
            }
        } catch (error) {
            console.error('Error calculando ABC:', error);
            toast.error('Error al calcular clasificación ABC', { id: 'abc' });
        } finally {
            setAnalyzing(false);
        }
    };

    const handleCellClick = (product) => {
        if (product) {
            setSelectedProduct(product);
            setShowModal(true);
        }
    };

    // Determinar color de celda según estado
    // Determinar color de celda según estado
    const getCellColor = (product) => {
        if (!product) return 'bg-gray-50';

        // 1. Si hay análisis de consumo válido (days_until_stockout no es null)
        if (product.days_until_stockout !== null && product.days_until_stockout !== undefined) {
            if (product.days_until_stockout <= 0) return 'bg-red-500 text-white'; // Agotado
            if (product.days_until_stockout <= 3) return 'bg-orange-400 text-white'; // Crítico
            if (product.days_until_stockout <= 7) return 'bg-yellow-300 text-gray-900'; // Bajo
        }

        // 2. Fallback: Si no hay análisis, usar stock vs mínimo
        const minStock = product.min_inventory_qty || 0;
        if (product.current_stock <= 0) return 'bg-red-500 text-white'; // Sin stock
        if (product.current_stock <= minStock) return 'bg-yellow-300 text-gray-900'; // Bajo mínimo

        // 3. Si tiene sugerencia de pedido, resaltar también
        if (product.suggested_order_qty > 0) return 'bg-blue-200 text-blue-900';

        return 'bg-green-100 text-green-900'; // Normal
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            {showFinancials && (
                <div className="w-full mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        📦 Gestión de Inventario y Reaprovisionamiento
                    </h1>
                    <p className="text-gray-600">
                        Vista matricial de inventario. Haz clic en una celda para ver detalles y configurar.
                    </p>
                </div>
            )}

            {/* Dashboard de KPIs - Solo para admin y cartera */}
            {showFinancials && <InventoryDashboard />}

            {/* Desglose por Categoría - Solo para admin y cartera */}
            {showFinancials && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                    {(() => {
                        // 1. Calcular Costo Total Global para porcentajes
                        let grandTotalCostNet = 0;
                        const catCosts = {};
                        const subcatStats = {};

                        categories.forEach(cat => {
                            const catData = groupedProducts[cat];
                            if (!catData) return;

                            let catTotal = 0;
                            if (!subcatStats[cat]) subcatStats[cat] = {};

                            Object.entries(catData).forEach(([subgroup, presentations]) => {
                                let subTotal = 0;
                                let subUnits = 0;

                                Object.values(presentations).forEach(flavors => {
                                    Object.values(flavors).forEach(product => {
                                        const stock = Number(product.current_stock || 0);
                                        const cost = Number(product.purchasing_price || 0) || (Number(product.standard_price || 0) / 1.19);
                                        subTotal += stock * cost;
                                        subUnits += stock;
                                    });
                                });

                                subcatStats[cat][subgroup] = { cost: subTotal, units: subUnits };
                                catTotal += subTotal;
                            });

                            catCosts[cat] = catTotal;
                            if (catTotal > 0 && cat !== 'SIN CLASIFICAR' && cat !== 'SIN CATEGORIA') {
                                grandTotalCostNet += catTotal;
                            }
                        });

                        // 2. Renderizar tarjetas
                        return categories.map(cat => {
                            const catData = groupedProducts[cat];
                            if (!catData) return null;

                            const totalCostNet = catCosts[cat] || 0;
                            const percent = grandTotalCostNet > 0 ? (totalCostNet / grandTotalCostNet) * 100 : 0;

                            let totalStock = 0;
                            Object.values(catData).forEach(presentations => {
                                Object.values(presentations).forEach(flavors => {
                                    Object.values(flavors).forEach(product => {
                                        totalStock += Number(product.current_stock || 0);
                                    });
                                });
                            });

                            return (
                                <div key={cat} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 relative overflow-hidden">
                                    <div className="absolute top-2 right-2 p-1 bg-blue-50 rounded text-center min-w-[40px]">
                                        <span className="text-xl font-bold text-blue-600 block">{percent.toFixed(1)}%</span>
                                    </div>

                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate pr-10" title={cat}>{cat}</h3>
                                    <p className="text-lg font-bold text-gray-800">
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalCostNet)}
                                    </p>
                                    <p className="text-[10px] text-indigo-600 font-medium">Costo antes de IVA</p>
                                    <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-1">
                                        <span className="text-[10px] text-gray-500">Und: <span className="font-bold text-gray-700">{totalStock}</span></span>
                                        <span className="text-[9px] text-gray-400 truncate">c/IVA: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalCostNet * 1.19)}</span>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}



            {/* Actions Bar */}
            <div className="w-full mb-6 bg-white rounded-lg shadow p-4 sticky top-0 z-20">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    {showFinancials ? (
                        <div className="flex gap-2 items-center">
                            <label className="text-sm font-medium text-gray-700">Días de cobertura:</label>
                            <select
                                value={coverageDays}
                                onChange={(e) => setCoverageDays(Number(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={3}>3 días</option>
                                <option value={7}>7 días</option>
                                <option value={15}>15 días</option>
                            </select>

                            <button
                                onClick={handleAnalyzeConsumption}
                                disabled={analyzing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                                {analyzing ? 'Analizando...' : 'Analizar Consumo'}
                            </button>

                            <button
                                onClick={handleCalculateABC}
                                disabled={analyzing}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <TrendingUp className="w-4 h-4" />
                                Calcular ABC
                            </button>

                            <button
                                onClick={async () => {
                                    toast.loading('Generando Excel...', { id: 'excel' });
                                    const success = await inventoryManagementService.exportToExcel();
                                    if (success) toast.success('Excel descargado', { id: 'excel' });
                                    else toast.error('Error descargando Excel', { id: 'excel' });
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Exportar Excel
                            </button>

                            <button
                                onClick={async () => {
                                    if (!supplierFilter) return;
                                    toast.loading(`Generando Orden para ${supplierFilter}...`, { id: 'po' });
                                    const result = await inventoryManagementService.generatePurchaseOrder(supplierFilter);
                                    if (result === true) {
                                        toast.success('Orden de Compra descargada', { id: 'po' });
                                    } else {
                                        toast.error(result?.message || 'Error generando orden', { id: 'po' });
                                    }
                                }}
                                disabled={!supplierFilter}
                                className={`px-4 py-2 text-white rounded-md flex items-center gap-2 ${supplierFilter
                                    ? 'bg-indigo-600 hover:bg-indigo-700'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                                title={!supplierFilter ? "Selecciona un proveedor primero" : "Generar Orden de Compra"}
                            >
                                <FileText className="w-4 h-4" />
                                Generar Orden
                            </button>
                        </div>
                    ) : <div />}

                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                            />
                        </div>

                        <select
                            value={abcFilter}
                            onChange={(e) => setAbcFilter(e.target.value)}
                            className="border rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">Todas las Clases ABC</option>
                            <option value="A">Clase A (Alta Rotación)</option>
                            <option value="B">Clase B (Media Rotación)</option>
                            <option value="C">Clase C (Baja Rotación)</option>
                        </select>

                        {/* Filtro Proveedor */}
                        <select
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                            className="border rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">Todos los Proveedores</option>
                            {uniqueSuppliers.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Matrix View */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="ml-2 text-gray-600">Cargando inventario...</p>
                </div>
            ) : (
                <>
                    <div className="space-y-12 w-full">
                        {categories.map(group => {
                            const groupData = groupedProducts[group];
                            // Si groupData es undefined (por seguridad), saltar
                            if (!groupData) return null;

                            // Definir orden específico de subgrupos
                            const SUBGROUP_ORDER = [
                                'HELADO PREMIUM',
                                'HELADO YOGURT',
                                'HELADO SUAVE',
                                'YOGURT SIN AZUCAR',
                                'SUAVE SIN AZUCAR'
                            ];

                            const subgroups = Object.keys(groupData).sort((a, b) => {
                                const idxA = SUBGROUP_ORDER.indexOf(a);
                                const idxB = SUBGROUP_ORDER.indexOf(b);

                                // Si ambos están en la lista, usar el orden de la lista
                                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                // Si solo A está en la lista, va primero
                                if (idxA !== -1) return -1;
                                // Si solo B está en la lista, va primero
                                if (idxB !== -1) return 1;
                                // Si ninguno está, alfabético
                                return a.localeCompare(b);
                            });

                            return (
                                <div key={group} className="space-y-6">
                                    {/* Encabezado del Grupo (Ficha Grande) */}
                                    <div className="flex items-center gap-4 border-b-2 border-gray-300 pb-2 mb-6">
                                        <h2 className="text-3xl font-extrabold text-gray-800 uppercase tracking-tight">
                                            {group}
                                        </h2>
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                            {subgroups.length} Subgrupos
                                        </span>
                                    </div>

                                    {/* Iterar Subgrupos */}
                                    {subgroups.map(subgroup => {
                                        const subgroupData = groupData[subgroup];

                                        // Obtener todos los sabores/variantes únicos de este subgrupo para las columnas
                                        const allFlavors = [...new Set(
                                            Object.values(subgroupData).flatMap(pres => Object.keys(pres))
                                        )].sort();

                                        return (
                                            <div key={subgroup} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                                                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                                    <h3 className="text-lg font-bold text-gray-700 uppercase tracking-wide">
                                                        {subgroup}
                                                    </h3>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full table-auto border-collapse">
                                                        <thead>
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-20 border-b border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[120px]">
                                                                    PRES
                                                                </th>
                                                                {/* Columna TOTAL */}
                                                                <th className="px-3 py-3 text-center text-xs font-extrabold text-indigo-700 uppercase tracking-wider min-w-[80px] border-b border-r-2 border-indigo-200 bg-indigo-50 sticky left-[120px] z-20">
                                                                    TOTAL
                                                                </th>
                                                                {allFlavors.map((flavor, idx) => (
                                                                    <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] border-b border-gray-100">
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <span className="text-xl filter drop-shadow-sm">{getFlavorIcon(flavor)}</span>
                                                                            <span className="text-[10px] font-bold leading-tight text-gray-600 max-w-[90px]">
                                                                                {flavor}
                                                                            </span>
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {Object.keys(subgroupData).sort((a, b) => comparePresentations(a, b)).map(presentation => {
                                                                const isLecheRow = presentation.includes('LECHE');
                                                                const rowBgClass = isLecheRow ? 'bg-blue-50' : '';

                                                                return (
                                                                    <tr key={presentation} className={rowBgClass}>
                                                                        <td className={`px-4 py-3 whitespace-nowrap text-xs ${isLecheRow ? 'font-extrabold text-blue-900' : 'font-bold text-gray-900'} sticky left-0 ${isLecheRow ? 'bg-blue-100' : 'bg-white'} z-20 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                                                                            {presentation}
                                                                        </td>
                                                                        {/* Celda TOTAL */}
                                                                        <td className={`px-3 py-3 text-center text-sm font-extrabold border-r-2 border-indigo-200 sticky left-[120px] z-20 ${isLecheRow ? 'bg-indigo-100 text-indigo-900' : 'bg-indigo-50 text-indigo-700'}`}>
                                                                            {(() => {
                                                                                const total = allFlavors.reduce((sum, flavor) => {
                                                                                    const product = subgroupData[presentation][flavor];
                                                                                    return sum + (product?.current_stock || 0);
                                                                                }, 0);
                                                                                return total > 0 ? total : '-';
                                                                            })()}
                                                                        </td>
                                                                        {allFlavors.map((flavor, idx) => {
                                                                            const product = subgroupData[presentation][flavor];

                                                                            if (!product) {
                                                                                return <td key={idx} className="px-2 py-3 text-center border-b border-gray-50 bg-gray-50/50"></td>;
                                                                            }

                                                                            // Colores estilo semáforo
                                                                            const cellColor = getCellColor(product);
                                                                            let textClass = 'text-gray-900';
                                                                            if (cellColor.includes('bg-red')) textClass = 'text-white';
                                                                            else if (cellColor.includes('bg-blue')) textClass = 'text-blue-900';
                                                                            else if (cellColor.includes('bg-green')) textClass = 'text-emerald-900';

                                                                            return (
                                                                                <td
                                                                                    key={idx}
                                                                                    onClick={() => handleCellClick(product)}
                                                                                    title={`${product.name}\nCódigo: ${product.internal_code}\nStock: ${product.current_stock}`}
                                                                                    className={`px-2 py-3 text-center cursor-pointer transition-colors duration-200 border-b border-gray-100 hover:brightness-95 ${cellColor}`}
                                                                                >
                                                                                    <div className="flex flex-col items-center justify-center h-full relative">
                                                                                        <span className={`text-lg font-bold leading-none ${textClass}`}>{product.current_stock}</span>

                                                                                        {/* Info Stock/Pedido */}
                                                                                        {product.days_until_stockout !== null && product.days_until_stockout <= 7 && (
                                                                                            <span className="text-[9px] opacity-80 mt-1 font-semibold block">
                                                                                                {product.days_until_stockout <= 0 ? 'Agotado' : `${product.days_until_stockout}d`}
                                                                                            </span>
                                                                                        )}
                                                                                        {product.suggested_order_qty > 0 ? (
                                                                                            <span className="mt-1 px-1.5 py-0.5 bg-white/40 rounded text-[9px] font-bold shadow-sm backdrop-blur-sm block">
                                                                                                Pedir: {product.suggested_order_qty}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-[8px] opacity-60 block mt-1">
                                                                                                Min:{product.min_inventory_qty}
                                                                                            </span>
                                                                                        )}

                                                                                        {/* Price Indicator */}
                                                                                        {product.purchasing_price > 0 && (
                                                                                            <div className="absolute top-[-4px] right-[-4px] bg-green-600 text-white rounded-full w-3 h-3 flex items-center justify-center text-[7px]" title={`$${product.purchasing_price}`}>
                                                                                                $
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </>
            )
            }

            {/* Modal de Detalles */}
            {
                showModal && selectedProduct && (
                    <ProductDetailsModal
                        product={selectedProduct}
                        onClose={() => setShowModal(false)}
                        onUpdate={handleUpdateConfig}
                        onAnalyze={handleAnalyzeConsumption}
                        readOnly={!showFinancials}
                    />
                )
            }
        </div >
    );
};

export default InventoryManagementPage;
