import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrencyCOP } from '../utils/formatters';

import { computeCollectionAmounts } from '../utils/payments';

const PickupPaymentModal = ({ isOpen, order, onClose, onConfirm }) => {
  const [payments, setPayments] = useState([
    { method: 'efectivo', amount: 0, files: [] }
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      // Calcular saldo pendiente inicial
      const paid = Number(order.paid_amount || 0);
      const cashRegistered = Number(order.total_cash_registered || 0);
      const total = Number(order.total_amount || 0);
      const pending = Math.max(0, total - paid - cashRegistered);

      setPayments([
        { method: (String(order.payment_method || 'efectivo')).toLowerCase().includes('transfer') ? 'transferencia' : 'efectivo', amount: 0, files: [] } // Iniciar en 0 a petición del usuario
      ]);
    }
  }, [order]);

  const addPaymentMethod = () => {
    setPayments([...payments, { method: 'transferencia', amount: 0, files: [] }]);
  };

  const removePaymentMethod = (index) => {
    if (payments.length > 1) {
      const newPayments = [...payments];
      newPayments.splice(index, 1);
      setPayments(newPayments);
    }
  };

  const updatePayment = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  const handleFileChange = (index, e) => {
    const newFiles = Array.from(e.target.files || []);
    const currentFiles = [...payments[index].files];
    updatePayment(index, 'files', [...currentFiles, ...newFiles]);
  };

  const removeFile = (pIndex, fIndex) => {
    const newFiles = [...payments[pIndex].files];
    newFiles.splice(fIndex, 1);
    updatePayment(pIndex, 'files', newFiles);
  };

  const [activePasteIndex, setActivePasteIndex] = useState(null);

  // Auto-activar el primer campo no efectivo al cargar o cambiar pagos
  useEffect(() => {
    const firstNonCashIndex = payments.findIndex(p => p.method !== 'efectivo');
    if (firstNonCashIndex !== -1) {
      setActivePasteIndex(firstNonCashIndex);
    } else {
      setActivePasteIndex(null);
    }
  }, [payments.length, payments.map(p => p.method).join(',')]);

  // Listener global para pegar
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      // Si no hay índice activo o el modal no está abierto, ignorar
      if (activePasteIndex === null || !isOpen) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault(); // Prevenir pegado default si es imagen
            const pastedFile = new File([file], `pasted-image-${Date.now()}-${i}.png`, { type: file.type });
            const currentFiles = [...payments[activePasteIndex].files];

            const newPayments = [...payments];
            newPayments[activePasteIndex].files = [...currentFiles, pastedFile];
            setPayments(newPayments);

            toast.success('Imagen pegada correctamente');
            return; // Solo pegar una a la vez para evitar duplicados si hay múltiples items
          }
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [activePasteIndex, isOpen, payments]);



  if (!isOpen || !order) return null;

  const totalRegistered = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Calcular restante considerando lo YA pagado previamente + lo que se está registrando ahora
  const previouslyPaid = Number(order?.paid_amount || 0) + Number(order?.total_cash_registered || 0);
  const remaining = Number(order.total_amount || 0) - previouslyPaid - totalRegistered;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    // Removida validación de > 0 por solicitud de usuario para permitir "confirmar sin pago previo"
    // if (payments.some(p => (Number(p.amount) || 0) <= 0)) {
    //   toast.error('Todos los montos deben ser mayores a cero');
    //   return;
    // }

    // Validación de tolerancia
    // Si remaining es negativo (están pagando de más) o positivo (falta plata), pedir confirmación
    // Pero solo si la diferencia es significativa (> 1 peso)
    if (Math.abs(remaining) > 1) {
      const message = remaining > 0
        ? `Aún faltan ${formatCurrencyCOP(remaining)} por cubrir. ¿Deseas registrar un pago parcial?`
        : `El monto registrado excede el saldo pendiente por ${formatCurrencyCOP(Math.abs(remaining))}. ¿Es correcto?`;

      if (!window.confirm(message)) {
        return;
      }
    }

    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      if (p.method !== 'efectivo' && p.files.length === 0) {
        toast.error(`El método ${p.method} requiere al menos un soporte de pago.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await onConfirm({
        orderId: order.id,
        payments: payments.map(p => ({
          method: p.method,
          amount: Number(p.amount),
          files: p.files
        }))
      });
      setSubmitting(false);
      onClose();
    } catch (err) {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icons.Wallet className="w-5 h-5 mr-2 text-emerald-600" />
            Recibir Pago en Bodega (Múltiples Medios)
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="px-5 py-4 overflow-y-auto space-y-6">
            <div className="flex justify-between items-start bg-gray-50 p-3 rounded-md border border-gray-100">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</div>
                <div className="text-sm font-bold text-gray-900">{order.order_number}</div>
                <div className="text-xs text-gray-600">{order.customer_name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pedido</div>
                <div className="text-lg font-bold text-emerald-700">{formatCurrencyCOP(order.total_amount)}</div>
              </div>
            </div>

            <div className="space-y-4">
              {payments.map((payment, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm relative group">
                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(index)}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icons.Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Método de pago</label>
                      <select
                        value={payment.method}
                        onChange={(e) => updatePayment(index, 'method', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Datáfono (Tarjeta)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Monto (COP)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={payment.amount}
                        onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  {payment.method !== 'efectivo' && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-500 mb-2 uppercase flex justify-between">
                        <span>Soportes / Evidencia <span className="text-red-500">*</span></span>
                        {activePasteIndex === index && (
                          <span className="text-emerald-600 text-[10px] font-bold animate-pulse">
                            LISTO PARA PEGAR (CTRL+V)
                          </span>
                        )}
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-md p-2 transition-all cursor-pointer text-center relative
                      ${activePasteIndex === index
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 ring-offset-1'
                            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100'
                          }`}
                        onClick={() => setActivePasteIndex(index)}
                      >
                        <div className="flex flex-col items-center" onClick={() => document.getElementById(`file-input-${index}`).click()}>
                          <Icons.ImagePlus className={`w-5 h-5 mb-1 ${activePasteIndex === index ? 'text-emerald-600' : 'text-gray-400'}`} />
                          <span className={`text-xs ${activePasteIndex === index ? 'text-emerald-700 font-medium' : 'text-gray-600'}`}>
                            {activePasteIndex === index ? 'Ctrl+V ahora' : 'Clic para pegar'}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">o buscar</span>
                        </div>
                        <input
                          id={`file-input-${index}`}
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(index, e)}
                        />
                      </div>

                      {payment.files.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {payment.files.map((f, fIdx) => (
                            <div key={fIdx} className="relative group/file w-16 h-16 border rounded bg-white p-1">
                              <img
                                src={URL.createObjectURL(f)}
                                alt="preview"
                                className="w-full h-full object-cover rounded-sm"
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeFile(index, fIdx); }}
                                className="absolute -top-1 -right-1 bg-gray-900 text-white rounded-full p-0.5 opacity-0 group-hover/file:opacity-100"
                              >
                                <Icons.X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPaymentMethod}
              className="w-full py-2 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 flex items-center justify-center font-medium transition-colors"
            >
              <Icons.PlusCircle className="w-4 h-4 mr-2" />
              Adicionar otro medio de pago
            </button>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="flex flex-col mb-4 gap-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Total Pedido:</span>
                <span>{formatCurrencyCOP(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Pagado Anteriormente:</span>
                <span>{formatCurrencyCOP(previouslyPaid)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Saldo Pendiente (Restante):</span>
                <span className={`text-lg font-bold ${remaining === 0 ? 'text-emerald-600' : remaining > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  {formatCurrencyCOP(remaining)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2 bg-emerald-50 p-2 rounded">
                <span className="text-emerald-800 font-medium">Total a Registrar Ahora:</span>
                <span className="font-bold text-emerald-900">{formatCurrencyCOP(totalRegistered)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 shadow-sm font-semibold flex items-center"
              >
                {submitting ? (
                  <>
                    <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : 'Registrar todos los pagos'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PickupPaymentModal;
