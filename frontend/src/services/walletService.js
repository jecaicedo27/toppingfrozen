import api from './api';

export const getBancolombiaCredentials = async () => {
    const response = await api.get('/wallet/bancolombia-credentials');
    return response.data;
};

export const saveBancolombiaCredentials = async (data) => {
    const response = await api.post('/wallet/bancolombia-credentials', data);
    return response.data;
};

export const requestSyncBancolombia = async () => {
    const response = await api.post('/wallet/sync-bancolombia/request');
    return response.data;
};

export const getBancolombiaSyncStatus = async () => {
    const response = await api.get('/wallet/sync-bancolombia/status');
    return response.data;
};
