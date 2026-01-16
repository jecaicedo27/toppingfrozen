const express = require('express');
const router = express.Router();
const mixturesAuditService = require('../services/mixturesAuditService');

/**
 * GET /api/mixtures-audit/relationships
 * Obtiene el mapeo completo de relaciones Mezcla A → Mezcla B con stocks actuales
 */
router.get('/relationships', async (req, res) => {
    try {
        const relationships = await mixturesAuditService.getRelationshipsMap();

        res.json({
            success: true,
            count: relationships.length,
            data: relationships
        });
    } catch (error) {
        console.error('Error fetching relationships:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener relaciones de mezclas',
            error: error.message
        });
    }
});

/**
 * GET /api/mixtures-audit/inconsistencies
 * Analiza y retorna inconsistencias detectadas en las relaciones
 */
router.get('/inconsistencies', async (req, res) => {
    try {
        const inconsistencies = await mixturesAuditService.analyzeInconsistencies();

        res.json({
            success: true,
            count: inconsistencies.length,
            data: inconsistencies
        });
    } catch (error) {
        console.error('Error analyzing inconsistencies:', error);
        res.status(500).json({
            success: false,
            message: 'Error al analizar inconsistencias',
            error: error.message
        });
    }
});

/**
 * GET /api/mixtures-audit/summary-by-milk
 * Obtiene resumen de stocks agrupados por leche (Mezcla B)
 */
router.get('/summary-by-milk', async (req, res) => {
    try {
        const summary = await mixturesAuditService.getStockSummaryByMilk();

        res.json({
            success: true,
            count: summary.length,
            data: summary
        });
    } catch (error) {
        console.error('Error getting summary by milk:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resumen por leche',
            error: error.message
        });
    }
});

module.exports = router;
