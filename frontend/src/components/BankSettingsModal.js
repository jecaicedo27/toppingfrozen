import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getBancolombiaCredentials, saveBancolombiaCredentials, requestSyncBancolombia } from '../services/walletService';

const BankSettingsModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        nit: '',
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [configured, setConfigured] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            checkStatus();
        }
    }, [isOpen]);

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
                    password: '' // Never show password back
                }));
                setLastUpdate(data.updated_at);
            } else {
                setConfigured(false);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error verificando estado de credenciales');
        } finally {
            setChecking(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nit || !formData.username || !formData.password) {
            toast.error('Todos los campos son obligatorios para actualizar');
            return;
        }

        try {
            setLoading(true);
            await saveBancolombiaCredentials(formData);
            toast.success('Credenciales guardadas correctamente');
            setConfigured(true);
            checkStatus(); // Refresh to get updated_at
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar credenciales');
        } finally {
            setLoading(false);
        }
    };

    const handleRunSync = async () => {
        if (!configured) return;
        try {
            setSyncing(true);
            toast.loading('Solicitando sincronización...', { id: 'robot-start' });
            await requestSyncBancolombia();
            toast.success('Solicitud enviada. Recuerda ejecutar el agente en tu PC.', { id: 'robot-start' });
        } catch (error) {
            console.error(error);
            toast.error('Error iniciando el robot', { id: 'robot-start' });
        } finally {
            setSyncing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Icons.Settings className="w-6 h-6 mr-2 text-blue-600" />
                        Configuración Bancolombia
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <Icons.X className="w-6 h-6" />
                    </button>
                </div>

                {checking ? (
                    <div className="flex justify-center py-10">
                        <Icons.Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${configured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <div className="flex items-center">
                                {configured ? (
                                    <Icons.CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                ) : (
                                    <Icons.AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                                )}
                                <div>
                                    <p className={`font-bold ${configured ? 'text-green-800' : 'text-yellow-800'}`}>
                                        {configured ? 'Credenciales Configuradas' : 'Pendiente Configuración'}
                                    </p>
                                    {lastUpdate && <p className="text-xs text-gray-500">Act: {new Date(lastUpdate).toLocaleString()}</p>}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NIT / Documento</label>
                                <input
                                    name="nit"
                                    value={formData.nit}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: 900123456"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                                <input
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Usuario SVN"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder={configured ? "•••••••• (Dejar en blanco para no cambiar)" : "Contraseña"}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Se almacena de forma segura en la base de datos.</p>
                            </div>

                            <div className="pt-4 flex justify-between space-x-3">
                                {/* Botón de Test/Sync (Solo si está configurado) */}
                                {configured && (
                                    <button
                                        type="button"
                                        onClick={handleRunSync}
                                        disabled={syncing}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center disabled:opacity-50"
                                        title="Ejecutar robot de descarga ahora"
                                    >
                                        {syncing ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.PlayCircle className="w-4 h-4 mr-2" />}
                                        Probar Sync
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center ml-auto disabled:opacity-50"
                                >
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

export default BankSettingsModal;
