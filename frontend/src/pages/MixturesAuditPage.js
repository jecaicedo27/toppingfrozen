import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import * as mixturesAuditService from '../services/mixturesAuditService';

const MixturesAuditPage = () => {
    const [activeTab, setActiveTab] = useState('relationships');
    const [loading, setLoading] = useState(false);
    const [relationships, setRelationships] = useState([]);
    const [inconsistencies, setInconsistencies] = useState([]);
    const [summaryByMilk, setSummaryByMilk] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [relData, incData, sumData] = await Promise.all([
                mixturesAuditService.getRelationships(),
                mixturesAuditService.getInconsistencies(),
                mixturesAuditService.getSummaryByMilk()
            ]);

            setRelationships(relData.data || []);
            setInconsistencies(incData.data || []);
            setSummaryByMilk(sumData.data || []);
        } catch (error) {
            console.error('Error loading audit data:', error);
            toast.error('Error al cargar datos de auditoría');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ok': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'alert': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        if (status === 'ok') return <CheckCircle className="w-5 h-5 text-green-600" />;
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    Auditoría de Mezclas A/B
                </h1>
                <p className="text-gray-600">
                    Monitoreo de relaciones entre sabores (Mezcla A) y leches (Mezcla B)
                </p>
            </div>

            {/* Alertas Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Relaciones</p>
                            <p className="text-2xl font-bold text-gray-800">{relationships.length}</p>
                        </div>
                        <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Alertas Activas</p>
                            <p className="text-2xl font-bold text-red-600">
                                {inconsistencies.filter(i => i.status === 'alert').length}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Advertencias</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                {inconsistencies.filter(i => i.status === 'warning').length}
                            </p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="mb-4 flex justify-end">
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => setActiveTab('relationships')}
                            className={`px-6 py-3 text-sm font-medium ${activeTab === 'relationships'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Mapa de Relaciones
                        </button>
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`px-6 py-3 text-sm font-medium ${activeTab === 'summary'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Resumen por Leche
                        </button>
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`px-6 py-3 text-sm font-medium ${activeTab === 'alerts'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Alertas ({inconsistencies.length})
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {/* Tab: Relationships */}
                    {activeTab === 'relationships' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Mezcla A (Sabor)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Stock A
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Mezcla B (Leche)
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Stock B
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Ratio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {relationships.map((rel, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div>
                                                    <div className="font-medium text-gray-900">{rel.mixtureA.code}</div>
                                                    <div className="text-gray-500 text-xs">{rel.mixtureA.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {rel.mixtureA.stock}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div>
                                                    <div className="font-medium text-gray-900">{rel.mixtureB.code}</div>
                                                    <div className="text-gray-500 text-xs">{rel.mixtureB.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {rel.mixtureB.stock}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {rel.ratio || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(rel.status)}`}>
                                                    {getStatusIcon(rel.status)}
                                                    {rel.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab: Summary by Milk */}
                    {activeTab === 'summary' && (
                        <div className="space-y-4">
                            {summaryByMilk.map((milk, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{milk.milkName}</h3>
                                            <p className="text-sm text-gray-600">Stock disponible: <span className="font-bold">{milk.milkStock}</span> unidades</p>
                                            <p className="text-sm text-gray-600">Consumo esperado: <span className="font-bold">{milk.expectedConsumption}</span> unidades</p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${milk.milkStock >= milk.expectedConsumption
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {milk.milkStock >= milk.expectedConsumption ? 'Suficiente' : 'Insuficiente'}
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Sabores que usan esta leche:</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {milk.flavors.map((flavor, fIdx) => (
                                                <div key={fIdx} className="text-xs bg-gray-50 p-2 rounded">
                                                    <div className="font-medium">{flavor.code}</div>
                                                    <div className="text-gray-600">Stock: {flavor.stock}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab: Alerts */}
                    {activeTab === 'alerts' && (
                        <div className="space-y-3">
                            {inconsistencies.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    <p className="text-lg font-medium text-gray-900">¡Todo está en orden!</p>
                                    <p className="text-gray-600">No se detectaron inconsistencias en las relaciones Mezcla A/B</p>
                                </div>
                            ) : (
                                inconsistencies.map((inc, idx) => (
                                    <div key={idx} className={`border-l-4 p-4 rounded-r-lg ${inc.status === 'alert'
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-yellow-500 bg-yellow-50'
                                        }`}>
                                        <div className="flex items-start">
                                            <AlertTriangle className={`w-5 h-5 mt-0.5 mr-3 ${inc.status === 'alert' ? 'text-red-600' : 'text-yellow-600'
                                                }`} />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900 mb-1">{inc.message}</p>
                                                <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-700">
                                                    <div>
                                                        <span className="font-semibold">Sabor:</span> {inc.mixtureACode} ({inc.mixtureAStock} unidades)
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold">Leche:</span> {inc.mixtureBCode} ({inc.mixtureBStock} unidades)
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MixturesAuditPage;
