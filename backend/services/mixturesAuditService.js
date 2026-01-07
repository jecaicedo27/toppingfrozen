const db = require('../config/database');

/**
 * Mapeo estático de relaciones Mezcla A (sabor) → Mezcla B (leche)
 * Basado en documentación del negocio
 */
const MIXTURE_RELATIONSHIPS = {
    // Helado Especial
    'MEY09': 'MEL02', // Yogurt Natural Descremado → Yogurt Frozzen
    'MEP04': 'MEL04', // Vainilla Descremada → Descremada
    'MEY17': 'MEL06', // Yogurt Natural Alulosa → Yogurt alulosa
    'MEY18': 'MEL06', // Yogurt Griego Alulosa → Yogurt alulosa
    'MES28': 'MEL07', // Helado suave vainilla alulosa → Helado Suave alulosa

    // Helado Gelato
    'MES10': 'MEL05', // Gelato Neutro → Gelato
    'MES24': 'MEL01', // Gelato Vainilla → Helado Suave

    // Helado Premium - Todos usan MEL03
    'MEP01': 'MEL03',
    'MEP02': 'MEL03',
    'MEP03': 'MEL03',
    'MEP05': 'MEL03',
    'MEP06': 'MEL03',

    // Helado Suave - Todos usan MEL01
    'MES01': 'MEL01', 'MES02': 'MEL01', 'MES03': 'MEL01', 'MES04': 'MEL01',
    'MES05': 'MEL01', 'MES06': 'MEL01', 'MES07': 'MEL01', 'MES08': 'MEL01',
    'MES09': 'MEL01', 'MES11': 'MEL01', 'MES12': 'MEL01', 'MES13': 'MEL01',
    'MES14': 'MEL01', 'MES15': 'MEL01', 'MES16': 'MEL01', 'MES17': 'MEL01',
    'MES18': 'MEL01', 'MES19': 'MEL01', 'MES20': 'MEL01', 'MES21': 'MEL01',
    'MES22': 'MEL01', 'MES23': 'MEL01', 'MES26': 'MEL01', 'MES27': 'MEL01',

    // Helado Yogurt - Todos usan MEL02
    'MEY01': 'MEL02', 'MEY02': 'MEL02', 'MEY03': 'MEL02', 'MEY04': 'MEL02',
    'MEY05': 'MEL02', 'MEY06': 'MEL02', 'MEY07': 'MEL02', 'MEY08': 'MEL02',
    'MEY10': 'MEL02', 'MEY11': 'MEL02', 'MEY13': 'MEL02', 'MEY14': 'MEL02',
    'MEY16': 'MEL02'
};

/**
 * Obtiene el mapeo completo de relaciones con información de productos
 */
async function getRelationshipsMap() {
    try {
        const relationships = [];

        for (const [mixtureACode, mixtureBCode] of Object.entries(MIXTURE_RELATIONSHIPS)) {
            const [mixtureA] = await db.query(
                'SELECT id, product_name, internal_code, available_quantity FROM products WHERE internal_code = ?',
                [mixtureACode]
            );

            const [mixtureB] = await db.query(
                'SELECT id, product_name, internal_code, available_quantity FROM products WHERE internal_code = ?',
                [mixtureBCode]
            );

            if (mixtureA.length > 0 && mixtureB.length > 0) {
                relationships.push({
                    mixtureA: {
                        id: mixtureA[0].id,
                        code: mixtureA[0].internal_code,
                        name: mixtureA[0].product_name,
                        stock: mixtureA[0].available_quantity || 0
                    },
                    mixtureB: {
                        id: mixtureB[0].id,
                        code: mixtureB[0].internal_code,
                        name: mixtureB[0].product_name,
                        stock: mixtureB[0].available_quantity || 0
                    },
                    ratio: mixtureA[0].available_quantity && mixtureB[0].available_quantity
                        ? (mixtureA[0].available_quantity / mixtureB[0].available_quantity).toFixed(2)
                        : null,
                    status: getRelationshipStatus(mixtureA[0].available_quantity, mixtureB[0].available_quantity)
                });
            }
        }

        return relationships;
    } catch (error) {
        console.error('Error getting relationships map:', error);
        throw error;
    }
}

/**
 * Determina el estado de la relación basado en stocks
 */
function getRelationshipStatus(stockA, stockB) {
    if (!stockA && !stockB) return 'ok'; // Ambos en 0
    if (!stockA || !stockB) return 'warning'; // Solo uno en 0

    const ratio = stockA / stockB;

    // Idealmente debería ser 1:1, pero permitimos pequeñas variaciones
    if (ratio >= 0.9 && ratio <= 1.1) return 'ok';
    if (ratio >= 0.7 && ratio <= 1.3) return 'warning';
    return 'alert';
}

/**
 * Analiza inconsistencias en las relaciones
 */
async function analyzeInconsistencies() {
    try {
        const relationships = await getRelationshipsMap();
        const inconsistencies = relationships.filter(r => r.status === 'alert' || r.status === 'warning');

        return inconsistencies.map(inc => ({
            mixtureAName: inc.mixtureA.name,
            mixtureACode: inc.mixtureA.code,
            mixtureAStock: inc.mixtureA.stock,
            mixtureBName: inc.mixtureB.name,
            mixtureBCode: inc.mixtureB.code,
            mixtureBStock: inc.mixtureB.stock,
            ratio: inc.ratio,
            status: inc.status,
            message: `Stock desproporcionado: ${inc.mixtureA.code} tiene ${inc.mixtureA.stock} unidades pero ${inc.mixtureB.code} tiene ${inc.mixtureB.stock} unidades. Ratio: ${inc.ratio}:1`
        }));
    } catch (error) {
        console.error('Error analyzing inconsistencies:', error);
        throw error;
    }
}

/**
 * Obtiene resumen de stocks agrupados por leche (Mezcla B)
 */
async function getStockSummaryByMilk() {
    try {
        const summary = {};

        // Agrupar por código de leche
        for (const [mixtureACode, mixtureBCode] of Object.entries(MIXTURE_RELATIONSHIPS)) {
            if (!summary[mixtureBCode]) {
                const [milk] = await db.query(
                    'SELECT product_name, internal_code, available_quantity FROM products WHERE internal_code = ?',
                    [mixtureBCode]
                );

                if (milk.length > 0) {
                    summary[mixtureBCode] = {
                        milkName: milk[0].product_name,
                        milkStock: milk[0].available_quantity || 0,
                        expectedConsumption: 0,
                        flavors: []
                    };
                }
            }

            const [flavor] = await db.query(
                'SELECT product_name, internal_code, available_quantity FROM products WHERE internal_code = ?',
                [mixtureACode]
            );

            if (flavor.length > 0 && summary[mixtureBCode]) {
                summary[mixtureBCode].flavors.push({
                    code: flavor[0].internal_code,
                    name: flavor[0].product_name,
                    stock: flavor[0].available_quantity || 0
                });
                summary[mixtureBCode].expectedConsumption += (flavor[0].available_quantity || 0);
            }
        }

        return Object.values(summary);
    } catch (error) {
        console.error('Error getting stock summary by milk:', error);
        throw error;
    }
}

module.exports = {
    getRelationshipsMap,
    analyzeInconsistencies,
    getStockSummaryByMilk,
    MIXTURE_RELATIONSHIPS
};
