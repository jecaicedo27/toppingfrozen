
import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import toast from 'react-hot-toast';

const MultiplePaymentEvidenceUpload = ({ orderId, onUploadComplete, onEvidencesChange, onFilesSelected }) => {
    const [selectedFiles, setSelectedFiles] = useState([]); // Array of { file, preview, type, id }
    const [uploading, setUploading] = useState(false);
    const [existingEvidences, setExistingEvidences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    // Cargar comprobantes existentes
    React.useEffect(() => {
        if (orderId) {
            loadExistingEvidences();
        }
    }, [orderId]);

    // Cleanup de previews al desmontar
    React.useEffect(() => {
        return () => {
            selectedFiles.forEach(f => {
                if (f.preview) URL.revokeObjectURL(f.preview);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Notificar cambio en archivos seleccionados
    React.useEffect(() => {
        if (onFilesSelected) {
            onFilesSelected(selectedFiles.length);
        }
    }, [selectedFiles, onFilesSelected]);

    const loadExistingEvidences = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/wallet/payment-evidences/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const evidences = data.data || [];
                setExistingEvidences(evidences);
                if (onEvidencesChange) onEvidencesChange(evidences.length);
            }
        } catch (error) {
            console.error('Error cargando comprobantes:', error);
        } finally {
            setLoading(false);
        }
    };

    const processFiles = (files) => {
        const newFiles = [];
        for (const file of files) {
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                toast.error(`${file.name}: Solo se permiten imágenes y PDFs`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name}: El archivo no puede ser mayor a 5MB`);
                continue;
            }

            newFiles.push({
                file,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                type: file.type.startsWith('image/') ? 'image' : 'pdf',
                id: Math.random().toString(36).substr(2, 9)
            });
        }

        if (newFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
            // toast.success(`${newFiles.length} archivo(s) añadido(s)`);
        }
    };

    // Manejar pegado de archivos
    React.useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            const pastedFiles = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === 'file') {
                    const file = items[i].getAsFile();
                    if (file) pastedFiles.push(file);
                }
            }

            if (pastedFiles.length > 0) {
                e.preventDefault();
                processFiles(pastedFiles);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        processFiles(files);
        e.target.value = ''; // Reset input
    };

    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => {
            const fileToRemove = prev[index];
            if (fileToRemove.preview) URL.revokeObjectURL(fileToRemove.preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            toast.error('Debe seleccionar al menos un archivo');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('orderId', orderId);

            selectedFiles.forEach((item) => {
                formData.append('payment_evidences', item.file);
            });

            const response = await fetch('/api/wallet/payment-evidences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(data.message || 'Comprobantes subidos exitosamente');

                // Limpiar previews
                selectedFiles.forEach(f => {
                    if (f.preview) URL.revokeObjectURL(f.preview);
                });
                setSelectedFiles([]);

                await loadExistingEvidences();
                if (onUploadComplete) onUploadComplete();
            } else {
                const error = await response.json();
                toast.error(error.message || 'Error subiendo comprobantes');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error subiendo comprobantes');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (evidenceId) => {
        if (!window.confirm('¿Está seguro de eliminar este comprobante?')) {
            return;
        }

        try {
            const response = await fetch(`/api/wallet/payment-evidences/${evidenceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                toast.success('Comprobante eliminado');
                await loadExistingEvidences();
            } else {
                toast.error('Error eliminando comprobante');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error eliminando comprobante');
        }
    };

    return (
        <div className="space-y-4">
            {/* Sección de subida */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                    <Icons.Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                                Seleccionar comprobantes
                            </span>
                            <span className="mt-1 block text-xs text-gray-500">
                                Imágenes o PDFs hasta 5MB (máximo 5 archivos)
                            </span>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                accept="image/*,.pdf"
                                onChange={handleFileSelect}
                                className="sr-only"
                            />
                        </label>
                    </div>
                </div>

                {/* Lista de archivos seleccionados */}
                {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-4">
                        <p className="text-sm font-medium text-gray-700">
                            Archivos seleccionados ({selectedFiles.length}):
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedFiles.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="relative group border rounded-lg overflow-hidden bg-gray-50 shadow-sm"
                                >
                                    {item.type === 'image' && item.preview ? (
                                        <img
                                            src={item.preview}
                                            alt={item.file.name}
                                            className="w-full h-32 object-cover cursor-pointer"
                                            onClick={() => setPreviewImage(item.preview)}
                                        />
                                    ) : (
                                        <div className="w-full h-32 flex flex-col items-center justify-center text-gray-400">
                                            <Icons.FileText className="h-12 w-12 mb-2" />
                                            <span className="text-xs px-2 text-center truncate w-full">
                                                {item.file.name}
                                            </span>
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeSelectedFile(index);
                                        }}
                                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow-md hover:bg-red-700 transition-colors z-10"
                                        title="Eliminar"
                                    >
                                        <Icons.X className="h-4 w-4" />
                                    </button>

                                    {/* Overlay con nombre para imágenes */}
                                    {item.type === 'image' && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] p-1 truncate">
                                            {item.file.name}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
                        >
                            {uploading ? (
                                <>
                                    <Icons.Loader2 className="animate-spin h-4 w-4 mr-2" />
                                    Subiendo...
                                </>
                            ) : (
                                <>
                                    <Icons.Upload className="h-4 w-4 mr-2" />
                                    Subir {selectedFiles.length} archivo(s)
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Comprobantes existentes */}
            {loading ? (
                <div className="text-center py-4">
                    <Icons.Loader2 className="animate-spin h-6 w-6 mx-auto text-gray-400" />
                </div>
            ) : existingEvidences.length > 0 ? (
                <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Comprobantes subidos ({existingEvidences.length}):
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {existingEvidences.map((evidence) => (
                            <div
                                key={evidence.id}
                                className="relative group border rounded-lg overflow-hidden shadow-sm"
                            >
                                <img
                                    src={`/${evidence.file_path}`}
                                    alt="Comprobante"
                                    className="w-full h-32 object-cover cursor-pointer"
                                    onClick={() => setPreviewImage(`/${evidence.file_path}`)}
                                />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(evidence.id);
                                    }}
                                    className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded-full shadow-lg hover:bg-red-700 transition-all z-10"
                                    title="Eliminar permanentemente"
                                >
                                    <Icons.Trash2 className="h-3.5 w-3.5" />
                                </button>

                                <div className="p-2 bg-gray-50 border-t">
                                    <p className="text-[10px] text-gray-600 truncate font-medium">
                                        {evidence.uploaded_by_name || 'Usuario'}
                                    </p>
                                    <p className="text-[10px] text-gray-500">
                                        {new Date(evidence.uploaded_at).toLocaleDateString('es-CO')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                    No hay comprobantes subidos aún
                </div>
            )}

            {/* Modal de Vista Previa */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80 p-4 transition-opacity"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-full">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-10 -right-2 text-white hover:text-gray-300 transition-colors"
                        >
                            <Icons.X className="h-8 w-8" />
                        </button>
                        <img
                            src={previewImage}
                            alt="Vista previa"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="mt-4 text-center">
                            <a
                                href={previewImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-white bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-full text-sm transition-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Icons.Download className="h-4 w-4 mr-2" />
                                Abrir en pestaña nueva
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiplePaymentEvidenceUpload;
