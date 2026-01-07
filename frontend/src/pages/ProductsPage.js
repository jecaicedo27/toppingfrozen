import React, { useState, useEffect } from 'react';
import {
  Download,
  Search,
  BarChart3,
  Package,
  RefreshCw,
  Eye,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  Tag,
  DollarSign,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSiigo, setLoadingSiigo] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    active: false,
    percentage: 0,
    message: '',
    status: 'idle', // idle, starting, fetching, processing, completed, error
    detail: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState(''); // '', 'active', 'inactive'
  const [stats, setStats] = useState({});
  const [categories, setCategories] = useState([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [barcodeResult, setBarcodeResult] = useState(null);

  // Estado para el tipo de vista
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Estados de paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    startItem: 0,
    endItem: 0
  });

  // Función para cargar productos desde la base de datos con paginación
  const loadProducts = async (page = 1, search = '', category = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const pageSize = 20;

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: search || searchTerm || ''
      });

      // Agregar filtro de categorías si están seleccionadas
      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','));
      }

      // Agregar filtro de estado activo/inactivo
      if (activeFilter === 'active') {
        params.append('is_active', '1');
      } else if (activeFilter === 'inactive') {
        params.append('is_active', '0');
      }

      const response = await fetch(`/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
        setPagination(data.pagination || {
          currentPage: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          startItem: 0,
          endItem: 0
        });
      } else {
        toast.error('Error cargando productos: ' + data.message);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      toast.error('Error cargando productos');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar categorías desde el endpoint
  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  // Cargar productos al montar el componente y configurar WebSockets
  useEffect(() => {
    loadProducts(1, searchTerm);
    loadStats();
    loadCategories();

    // Configurar Socket.io para progreso de SIIGO
    const socket = io(); // Usa el proxy del package.json

    socket.on('connect', () => {
      console.log('🔌 WebSocket conectado para productos');
      socket.emit('join-siigo-updates');
    });

    socket.on('product-sync-progress', (data) => {
      console.log('📡 Progreso de sincronización:', data);
      setSyncProgress({
        active: data.status !== 'completed' && data.status !== 'error',
        percentage: data.progress,
        message: data.detail?.message || 'Sincronizando...',
        status: data.status,
        detail: data.detail
      });

      if (data.status === 'completed') {
        toast.success('Sincronización SIIGO completada con éxito');
        loadProducts();
        loadStats();
        setLoadingSiigo(false);
      } else if (data.status === 'error') {
        toast.error('Error en la sincronización: ' + (data.detail?.message || 'Error desconocido'));
        setLoadingSiigo(false);
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejar cambios de búsqueda y filtros - reiniciar a página 1
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts(1, searchTerm);
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, activeFilter, selectedCategories]);

  // Función para cargar estadísticas
  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  // Función para cargar productos desde SIIGO
  const loadProductsFromSiigo = async () => {
    if (syncProgress.active) {
      toast.error('Ya hay una sincronización en curso');
      return;
    }

    setLoadingSiigo(true);
    setSyncProgress({
      active: true,
      percentage: 0,
      message: 'Iniciando petición...',
      status: 'starting',
      detail: null
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products/load-from-siigo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.status === 202 || data.success) {
        toast.success(data.message || 'Sincronización iniciada correctamente.');
        // El estado LoadingSiigo se mantiene true hasta que el WebSocket diga 'completed' o 'error'
      } else {
        setLoadingSiigo(false);
        setSyncProgress({ ...syncProgress, active: false, status: 'error' });
        toast.error('Error al iniciar sincronización: ' + data.message);
      }
    } catch (error) {
      console.error('Error cargando productos desde SIIGO:', error);
      toast.error('Error conectando con el servidor');
      setLoadingSiigo(false);
      setSyncProgress({ ...syncProgress, active: false, status: 'error' });
    }
  };

  // Función para verificar código de barras
  const verifyBarcode = async () => {
    if (!scannedBarcode.trim()) {
      toast.error('Ingrese un código de barras');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/barcode/${scannedBarcode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setBarcodeResult(data.data);
        toast.success('Producto encontrado');
      } else {
        setBarcodeResult(null);
        toast.error('Producto no encontrado con ese código de barras');
      }
    } catch (error) {
      console.error('Error verificando código de barras:', error);
      toast.error('Error verificando código de barras');
    }
  };

  // Helper functions for category selection
  const handleCategoryToggle = (categoryValue) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(categoryValue);
      if (isSelected) {
        return prev.filter(cat => cat !== categoryValue);
      } else {
        return [...prev, categoryValue];
      }
    });
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
    setShowCategoryDropdown(false);
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  // Ya no necesitamos filtrar localmente, el backend hace el filtrado
  const filteredProducts = products;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="mr-3 text-blue-600" />
              Gestión de Productos y Códigos de Barras
            </h1>
            <p className="text-gray-600 mt-2">
              Administra productos y códigos de barras para el sistema de empaque
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadProductsFromSiigo}
              disabled={loadingSiigo}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              {loadingSiigo ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Cargar Productos
                </>
              )}
            </button>
            <button
              onClick={() => setShowBarcodeModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Verificar Código
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Progreso de Sincronización */}
      {syncProgress.active && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-blue-100 p-5 overflow-hidden relative">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <RefreshCw className={`w-5 h-5 text-blue-600 ${syncProgress.status !== 'completed' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Sincronización SIIGO en curso</h3>
                <div className="flex items-center mt-0.5">
                  <p className="text-sm text-gray-600 font-medium">{syncProgress.message}</p>
                  {syncProgress.status === 'fetching' && <span className="ml-2 flex h-2 w-2 rounded-full bg-blue-400 animate-ping"></span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-blue-600 tabular-nums">{syncProgress.percentage}%</span>
            </div>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-4 mb-1 overflow-hidden p-1 shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-700 ease-out rounded-full shadow-lg relative"
              style={{ width: `${syncProgress.percentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>

          {syncProgress.detail?.total && (
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-2 px-1">
              <span>Inicio de carga</span>
              <span className="text-blue-500">Procesando: {syncProgress.detail.processed} de {syncProgress.detail.total} productos</span>
              <span>Finalizando</span>
            </div>
          )}
        </div>
      )}

      {/* Estadísticas */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => setActiveFilter('')}
            className={`bg-white rounded-lg shadow p-6 text-center transition-colors hover:bg-blue-50 ${activeFilter === '' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
          >
            <h3 className="text-2xl font-bold text-blue-600 mb-1">{stats.total_products || 0}</h3>
            <p className="text-gray-600 text-sm">Total Productos</p>
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`bg-white rounded-lg shadow p-6 text-center transition-colors hover:bg-green-50 ${activeFilter === 'active' ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
          >
            <h3 className="text-2xl font-bold text-green-600 mb-1">{stats.active_products || 0}</h3>
            <p className="text-gray-600 text-sm">Activos</p>
          </button>
          <button
            onClick={() => setActiveFilter('inactive')}
            className={`bg-white rounded-lg shadow p-6 text-center transition-colors hover:bg-red-50 ${activeFilter === 'inactive' ? 'ring-2 ring-red-500 bg-red-50' : ''
              }`}
          >
            <h3 className="text-2xl font-bold text-red-600 mb-1">{(stats.total_products || 0) - (stats.active_products || 0)}</h3>
            <p className="text-gray-600 text-sm">Inactivos</p>
          </button>
          <button
            onClick={() => setActiveFilter('')}
            className={`bg-white rounded-lg shadow p-6 text-center transition-colors hover:bg-purple-50 ${activeFilter === '' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              }`}
          >
            <h3 className="text-2xl font-bold text-purple-600 mb-1">{stats.siigo_synced || 0}</h3>
            <p className="text-gray-600 text-sm">Sincronizados SIIGO</p>
          </button>
          <button
            onClick={() => setActiveFilter('')}
            className={`bg-white rounded-lg shadow p-6 text-center transition-colors hover:bg-yellow-50 ${activeFilter === '' ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''
              }`}
          >
            <h3 className="text-2xl font-bold text-yellow-600 mb-1">{stats.categories || 0}</h3>
            <p className="text-gray-600 text-sm">Categorías</p>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nombre, código de barras o código interno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <div className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg min-h-[42px] cursor-pointer focus-within:ring-2 focus-within:ring-blue-500">
            {/* Selected categories badges */}
            <div className="flex flex-wrap gap-1 min-h-[26px] items-center">
              {selectedCategories.length === 0 ? (
                <span
                  className="text-gray-500 text-sm cursor-pointer flex-1"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  Selecciona categorías (múltiples)
                </span>
              ) : (
                <div className="flex flex-wrap gap-1 flex-1">
                  {selectedCategories.map(categoryValue => (
                    <span
                      key={categoryValue}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center"
                    >
                      {getCategoryLabel(categoryValue)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCategoryToggle(categoryValue);
                        }}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="text-blue-600 hover:text-blue-700 text-sm px-2 py-1 rounded"
                  >
                    + Agregar
                  </button>
                </div>
              )}

              {/* Clear all button */}
              {selectedCategories.length > 0 && (
                <button
                  onClick={clearAllCategories}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="Limpiar todas las categorías"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Dropdown toggle */}
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown menu */}
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                <div className="p-2">
                  {categories.map(category => {
                    const isSelected = selectedCategories.includes(category.value);
                    return (
                      <div
                        key={category.value}
                        onClick={() => handleCategoryToggle(category.value)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                      >
                        <span className="flex-1">
                          {category.label} ({category.count})
                        </span>
                        <div className={`w-4 h-4 border-2 rounded ${isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                          } flex items-center justify-center`}>
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-sm"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {categories.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No hay categorías disponibles
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Productos ({filteredProducts.length})
          </h3>
          <div className="flex items-center space-x-2">
            {/* Toggle de vista */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'table'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="Vista de tabla"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'cards'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="Vista de tarjetas"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={loadProducts}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="ml-3 text-gray-600">Cargando productos...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre del Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código de Barras
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código Interno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Disponible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado SIIGO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variantes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{product.product_name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500">{product.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {product.barcode}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.internal_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.available_quantity !== null && product.available_quantity !== undefined ? (
                          <span className={`font-medium ${product.available_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {product.available_quantity} unidades
                          </span>
                        ) : (
                          <span className="text-gray-400">No disponible</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.standard_price ? (
                          `$${parseFloat(product.standard_price).toLocaleString()}`
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {product.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.variant_count > 0 && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                            {product.variant_count} variantes
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all duration-200 border hover:border-blue-200">
                  {/* Header con nombre y estado */}
                  <div className="mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                        {product.product_name}
                      </h4>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs flex-shrink-0 ${product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {product.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{product.description}</p>
                    )}
                  </div>

                  {/* Información principal */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {product.category}
                      </span>
                    </div>

                    {product.standard_price && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-3 h-3 text-gray-400" />
                        <span className="font-semibold text-green-600">
                          ${parseFloat(product.standard_price).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Package className="w-3 h-3 text-gray-400" />
                      {product.available_quantity !== null && product.available_quantity !== undefined ? (
                        <span className={`font-medium text-xs ${product.available_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {product.available_quantity} unidades
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Stock no disponible</span>
                      )}
                    </div>
                  </div>

                  {/* Códigos */}
                  <div className="space-y-1 border-t pt-2">
                    <div className="text-xs">
                      <span className="text-gray-500 font-medium">Código de barras:</span>
                      <code className="ml-1 bg-white px-1 py-0.5 rounded text-xs">{product.barcode}</code>
                    </div>
                    {product.internal_code && (
                      <div className="text-xs">
                        <span className="text-gray-500 font-medium">Código interno:</span>
                        <span className="ml-1 text-gray-700">{product.internal_code}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2">
                      {product.variant_count > 0 && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          {product.variant_count} variantes
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400">
                      {product.siigo_product_id ? 'Sincronizado' : 'Manual'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
            <p className="text-gray-500">
              {searchTerm || selectedCategories.length > 0
                ? 'No se encontraron productos con los filtros aplicados'
                : 'Haz clic en "Cargar Productos" para obtener productos desde SIIGO'
              }
            </p>
          </div>
        )}

        {/* Controles de paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => loadProducts(pagination.currentPage - 1, searchTerm)}
                disabled={!pagination.hasPreviousPage || loading}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => loadProducts(pagination.currentPage + 1, searchTerm)}
                disabled={!pagination.hasNextPage || loading}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{pagination.startItem}</span> a{' '}
                  <span className="font-medium">{pagination.endItem}</span> de{' '}
                  <span className="font-medium">{pagination.totalItems}</span> productos
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => loadProducts(pagination.currentPage - 1, searchTerm)}
                    disabled={!pagination.hasPreviousPage || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {/* Páginas */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNumber;
                    if (pagination.totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNumber = pagination.totalPages - 4 + i;
                    } else {
                      pageNumber = pagination.currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => loadProducts(pageNumber, searchTerm)}
                        disabled={loading}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${pageNumber === pagination.currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => loadProducts(pagination.currentPage + 1, searchTerm)}
                    disabled={!pagination.hasNextPage || loading}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de verificación de código de barras */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Verificar Código de Barras
              </h3>
              <button
                onClick={() => {
                  setShowBarcodeModal(false);
                  setScannedBarcode('');
                  setBarcodeResult(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="Escanea o ingresa el código de barras..."
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && verifyBarcode()}
                  autoFocus
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={verifyBarcode}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Search className="w-4 h-4 mr-1" />
                  Verificar
                </button>
              </div>

              {barcodeResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Eye className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-800 mb-2">Producto Encontrado</h4>
                      <p className="text-sm text-green-700 mb-1">
                        <strong>Nombre:</strong> {barcodeResult.product_name}
                      </p>
                      <p className="text-sm text-green-700 mb-1">
                        <strong>Código:</strong> {barcodeResult.barcode}
                      </p>
                      <p className="text-sm text-green-700 mb-1">
                        <strong>Categoría:</strong> {barcodeResult.category}
                      </p>
                      {barcodeResult.internal_code && (
                        <p className="text-sm text-green-700 mb-1">
                          <strong>Código Interno:</strong> {barcodeResult.internal_code}
                        </p>
                      )}
                      {barcodeResult.barcode_type === 'variant' && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          Variante de producto
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
