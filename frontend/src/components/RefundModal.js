import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import toast from 'react-hot-toast';
import { movementService } from '../services/api';
import { computeCollectionAmounts } from '../utils/payments';

const PAYMENT_METHODS = [
    { value: 'efectivo', label: 'Efectivo (Descuenta de Caja)' },
    { value: 'transferencia', label: 'Transferencia (Solo Registro)' },
    { value: 'pago_electronico', label: 'Pago Electrónico (Solo Registro)' },
    { value: 'otros', label: 'Otros (Solo Registro)' }
];

const RefundModal = ({ open, onClose, onSaved, order }) => {
    const [form, setForm] = useState({
        amount: '',
        method: 'efectivo',
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && order) {
            // Calcular monto sugerido de devolución (valor negativo productDue)
            const { productDue } = computeCollectionAmounts(order);
            const absAmount = productDue < 0 ? Math.abs(productDue) : '';
            setForm({
                amount: absAmount,
                method: 'efectivo',
                notes: ''
            });
        }
    }, [open, order]);

    if (!open || !order) return null;

    const handleSave = async () => {
        try {
            const amt = Number(form.amount || 0);
            if (!(amt > 0)) return toast.error('Ingresa un monto válido (> 0)');

            setLoading(true);

            // Decidir el tipo de movimiento basado en el método
            // Efectivo -> 'withdrawal' (Retiro de Caja)
            // Otros -> 'refund_tracking' (Solo registro)
            const type = form.method === 'efectivo' ? 'withdrawal' : 'refund_tracking';
            const reasonCode = 'devolucion_pedido';
            const reasonText = `Devolución Pedido ${order.order_number} (${GetMethodLabel(form.method)})`;

            await movementService.create({
                type,
                amount: amt,
                reason_code: reasonCode,
                reason_text: reasonText,
                order_id: order.id,
                order_number: order.order_number,
                notes: form.notes
            });

            toast.success(type === 'withdrawal'
                ? 'Devolución registrada y descontada de caja'
                : 'Devolución registrada (solo historial)');

            if (typeof onSaved === 'function') await onSaved();
            if (typeof onClose === 'function') onClose();
        } catch (e) {
            console.error(e);
            toast.error('Error al registrar devolución');
        } finally {
            setLoading(false);
        }
    };

    const GetMethodLabel = (val) => {
        return PAYMENT_METHODS.find(m => m.value === val)?.label || val;
    };

    const fmt = (n) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-purple-50 rounded-t-lg">
                    <h3 className="text-lg font-bold text-purple-900 flex items-center">
                        <Icons.Reply className="w-5 h-5 mr-2" />
                        Registrar Devolución
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-purple-50 p-3 rounded-md border border-purple-100 mb-4">
                        <p className="text-sm text-purple-800">
                            Registrando devolución para pedido <strong>{order.order_number}</strong>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Devolver</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                                className="focus:ring-purple-500 focus:border-purple-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
                                placeholder="0"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">COP</span>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-purple-600 font-medium text-right">
                            {fmt(form.amount)}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Devolución</label>
                        <select
                            value={form.method}
                            onChange={(e) => setForm(f => ({ ...f, method: e.target.value }))}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                        >
                            {PAYMENT_METHODS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            {form.method === 'efectivo'
                                ? '⚠️ Se generará un retiro de caja automáticamente.'
                                : 'ℹ️ Solo se guardará el registro, no afecta el saldo de caja.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (Opcional)</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={3}
                            className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Detalles adicionales..."
                        />
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || !form.amount || Number(form.amount) <= 0}
                    >
                        {loading ? 'Procesando...' : 'Confirmar Devolución'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RefundModal;
