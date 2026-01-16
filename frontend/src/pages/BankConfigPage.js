import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getBancolombiaCredentials, saveBancolombiaCredentials } from '../services/walletService';

const BankConfigPage = () => {
    const [formData, setFormData] = useState({
        nit: '',
        username: '',
        password: '',
        proxy: ''
    });
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, requested, processing, completed, error
    const [syncMessage, setSyncMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [configured, setConfigured] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        checkStatus();
        // Poll status if active
        const interval = setInterval(() => {
            if (['requested', 'processing'].includes(syncStatus)) {
                refreshSyncStatus();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [syncStatus]);

    const checkStatus = async () => {
        try {
            setChecking(true);
            const data = await getBancolombiaCredentials();
            if (data.configured) {
                setConfigured(true);
                setFormData(prev => ({
                    ...prev,
                    nit: data.nit,
                    username: data.username,
                    password: '',
                    proxy: data.proxy || ''
                }));
                setLastUpdate(data.updated_at);

                // Also check sync status
                refreshSyncStatus();
            } else {
                setConfigured(false);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error verificando estado');
        } finally {
            setChecking(false);
        }
    };

    const refreshSyncStatus = async () => {
        try {
            const { getBancolombiaSyncStatus } = require('../services/walletService');
            const data = await getBancolombiaSyncStatus();
            setSyncStatus(data.status);
            if (data.status === 'error') setSyncMessage(data.message || 'Error en sincronización');
            if (data.status === 'completed') setSyncMessage('Sincronización completada exitosamente.');
        } catch (e) { console.error(e); }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await saveBancolombiaCredentials(formData);
            toast.success('Credenciales guardadas');
            setConfigured(true);
            checkStatus();
        } catch (error) {
            toast.error('Error guardando');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSync = async () => {
        if (!configured) return;
        try {
            setSyncing(true);
            const { requestSyncBancolombia } = require('../services/walletService');
            await requestSyncBancolombia();
            setSyncStatus('requested');
            toast.success('Solicitud enviada. Ejecuta el agente en tu PC.');
        } catch (error) {
            console.error(error);
            toast.error('Error solicitando sincronización');
        } finally {
            setSyncing(false);
        }
    };

    // Helper for status colors
    const getStatusColor = () => {
        switch (syncStatus) {
            case 'requested': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'error': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'hidden';
        }
    };

    const getStatusText = () => {
        switch (syncStatus) {
            case 'requested': return 'Esperando Agente Local...';
            case 'processing': return 'Agente Procesando (Mira tu PC)...';
            case 'completed': return '¡Sincronización Exitosa!';
            case 'error': return 'Error: ' + syncMessage;
            default: return '';
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Icons.Settings className="w-6 h-6 mr-2 text-blue-600" />
                Configuración Bancolombia (Bridge)
            </h1>

            <div className="max-w-2xl bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {checking ? (
                    <div className="flex justify-center py-10">
                        <Icons.Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        {/* Status Alert */}
                        <div className={`mb-6 p-4 rounded-lg flex flex-col justify-between ${configured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <div className="flex items-center mb-2">
                                {configured ? <Icons.CheckCircle className="w-5 h-5 text-green-600 mr-2" /> : <Icons.AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />}
                                <p className={`font-bold ${configured ? 'text-green-800' : 'text-yellow-800'}`}>
                                    {configured ? 'Credenciales Configuradas' : 'Pendiente Configuración'}
                                </p>
                            </div>

                            {/* SYNC STATUS BAR */}
                            {syncStatus !== 'idle' && (
                                <div className={`mt-3 p-3 rounded border flex items-center animate-pulse ${getStatusColor()}`}>
                                    <Icons.RefreshCw className={`w-4 h-4 mr-2 ${syncStatus === 'processing' ? 'animate-spin' : ''}`} />
                                    <span className="font-medium">{getStatusText()}</span>
                                </div>
                            )}

                            {/* DOWNLOAD LINK FOR AGENT */}
                            {configured && (
                                <div className="mt-4 pt-4 border-t border-gray-200/50">
                                    <p className="text-sm text-gray-600 mb-2">Para sincronizar, necesitas el Agente en tu PC:</p>
                                    <a
                                        href="/download/bancolombia_agent.zip"
                                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                        download="bancolombia_agent.zip"
                                    >
                                        <Icons.Download className="w-4 h-4 mr-1" />
                                        Descargar bancolombia_agent.zip
                                    </a>
                                    <p className="text-xs text-gray-500 mt-2">
                                        1. Descomprime el ZIP.<br />
                                        2. Dale doble click a <b>run.bat</b> (Windows).
                                    </p>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Form Inputs (NIT, Username, Password, Proxy) - Same as before */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NIT / Documento</label>
                                <input name="nit" value={formData.nit} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: 900123456" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                                <input name="username" value={formData.username} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="Usuario SVN" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder={configured ? "••••••••" : "Contraseña"} />
                            </div>

                            <div className="pt-4 flex justify-between space-x-3">
                                {configured && (
                                    <button
                                        type="button"
                                        onClick={handleRequestSync}
                                        disabled={syncing || ['requested', 'processing'].includes(syncStatus)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {syncing ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.PlayCircle className="w-4 h-4 mr-2" />}
                                        {syncStatus === 'idle' || syncStatus === 'completed' || syncStatus === 'error' ? 'Sincronizar' : 'Sincronizando...'}
                                    </button>
                                )}

                                <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center ml-auto">
                                    {loading ? <Icons.Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Icons.Save className="w-4 h-4 mr-2" />}
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default BankConfigPage;
