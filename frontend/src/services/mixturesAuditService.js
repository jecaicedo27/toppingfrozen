import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Obtiene el mapeo completo de relaciones Mezcla A → Mezcla B
 */
export const getRelationships = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/mixtures-audit/relationships`);
        return response.data;
    } catch (error) {
        console.error('Error fetching relationships:', error);
        throw error;
    }
};

/**
 * Obtiene inconsistencias detectadas
 */
export const getInconsistencies = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/mixtures-audit/inconsistencies`);
        return response.data;
    } catch (error) {
        console.error('Error fetching inconsistencies:', error);
        throw error;
    }
};

/**
 * Obtiene resumen agrupado por leche
 */
export const getSummaryByMilk = async () => {
    try {
        const response = await axios.get(`${API_URL}/api/mixtures-audit/summary-by-milk`);
        return response.data;
    } catch (error) {
        console.error('Error fetching summary by milk:', error);
        throw error;
    }
};
