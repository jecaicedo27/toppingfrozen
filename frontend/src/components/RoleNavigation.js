import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from 'lucide-react';

const RoleNavigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Roles soportando multi-rol (user.role + user.roles[] del perfil)
  const rolesFromProfile = Array.isArray(user?.roles) ? user.roles.map(r => r.role_name) : [];
  const roleNames = Array.from(new Set([user?.role, ...rolesFromProfile].filter(Boolean)));

  // Definir qué vistas puede ver cada rol
  const allViews = [
    {
      id: 'todos-pedidos',
      name: 'Todos los Pedidos',
      icon: Icons.List,
      path: '/orders?view=todos',
      description: 'Ver todos los pedidos con todos los estados',
      clearFilters: true,
      roles: ['admin', 'facturador', 'cartera', 'logistica', 'mensajero']
    },
    {
      id: 'facturacion',
      name: 'Facturación',
      icon: Icons.FileText,
      path: '/orders?view=facturacion&status=pendiente_por_facturacion',
      description: 'Gestión de pedidos y facturación',
      roles: ['admin', 'facturador']
    },
    {
      id: 'cartera-group',
      name: 'Cartera',
      icon: Icons.CreditCard,
      roles: ['admin', 'cartera'],
      children: [
        {
          id: 'cartera',
          name: 'Pedidos en Cartera',
          icon: Icons.ListChecks,
          path: '/orders?view=cartera&status=revision_cartera',
          description: 'Verificación de pagos'
        },
        {
          id: 'cartera-cobros',
          name: 'Entrega de Efectivo',
          icon: Icons.Coins,
          path: '/cashier-collections',
          description: 'Recibir efectivo por factura y cerrar actas'
        },
        {
          id: 'treasury-audit',
          name: 'Auditoría Cartera',
          icon: Icons.ShieldCheck,
          path: '/treasury-audit',
          description: 'Historial de consignaciones y cambios de base'
        }
      ]
    },
    {
      id: 'logistica-group',
      name: 'Logística',
      icon: Icons.Package,
      roles: ['admin', 'logistica', 'empaque', 'empacador', 'cartera', 'facturador'],
      children: [
        {
          id: 'logistica',
          name: 'Gestión Logística',
          icon: Icons.Boxes,
          path: '/orders?view=logistica&status=en_logistica',
          description: 'Preparación y asignación de pedidos'
        },
        {
          id: 'empaque',
          name: 'Empaque',
          icon: Icons.Box,
          path: '/packaging',
          description: 'Control de calidad y empaque'
        },
        {
          id: 'ready-to-deliver',
          name: 'Pedidos por Entregar',
          icon: Icons.ClipboardCheck,
          path: '/ready-to-deliver',
          description: 'Listado de despachos listos'
        },
        {
          id: 'packaging-progress',
          name: 'Progreso Empaque',
          icon: Icons.Activity,
          path: '/packaging-progress',
          description: 'Seguimiento en tiempo real'
        },
        {
          id: 'evidence-gallery',
          name: 'Galería Evidencias',
          icon: Icons.Image,
          path: '/packaging/evidence-gallery',
          description: 'Fotos de empaque por pedido'
        }
      ]
    },
    {
      id: 'mensajero',
      name: 'Mensajero',
      icon: Icons.Truck,
      path: '/orders?view=mensajero',
      description: 'Entregas y cobros',
      roles: ['admin', 'logistica', 'mensajero']
    }
  ];

  // Filtrar vistas según el rol del usuario
  const roleViews = allViews.filter(view =>
    view.roles.some(r => roleNames.includes(r))
  );

  const scrollContainerRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const [showLeftArrow, setShowLeftArrow] = React.useState(false);
  const [showRightArrow, setShowRightArrow] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState(null);
  const [dropdownCoords, setDropdownCoords] = React.useState({ left: 0, top: 0 });

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Cerrar dropdown al hacer clic fuera o al hacer scroll
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Verificar si el clic fue en el botón disparador (para evitar doble toggle)
        if (!event.target.closest('.dropdown-trigger')) {
          setActiveDropdown(null);
        }
      }
    };

    const handleScroll = () => setActiveDropdown(null);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true); // true para capturar scroll en cualquier contenedor

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdown]);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [roleViews]);

  const getCurrentView = () => {
    const path = location.pathname;
    const search = location.search;
    const urlParams = new URLSearchParams(search);

    if (path === '/dashboard') return 'dashboard';

    const viewParam = urlParams.get('view');
    if (viewParam) {
      if (viewParam === 'todos') return 'todos-pedidos';
      return viewParam;
    }

    const statusParam = urlParams.get('status');
    if (path === '/orders' && statusParam) {
      if (statusParam === 'revision_cartera' || statusParam === 'pendiente_pago') {
        return 'cartera';
      }
      if (statusParam === 'en_logistica' || statusParam === 'preparando' || statusParam === 'listo_envio') {
        return 'logistica';
      }
      if (statusParam === 'en_reparto' || statusParam === 'entregado' || statusParam === 'devuelto') {
        return 'mensajero';
      }
    }

    if (path === '/users') return 'usuarios';
    if (path === '/postventa') return 'postventa';
    if (path === '/postventa-analytics') return 'postventa-analytics';
    if (path === '/automation') return 'automation';
    if (path === '/orders') return 'facturacion';
    if (path === '/billing' || path === '/siigo-invoices') return 'facturacion';
    if (path === '/siigo-consulta') return 'siigo-consulta';
    if (path === '/ready-to-deliver') return 'ready-to-deliver';
    if (path === '/packaging') return 'empaque';
    if (path === '/packaging-progress') return 'packaging-progress';
    if (path === '/packaging/evidence-gallery') return 'evidence-gallery';
    if (path === '/products') return 'productos';
    if (path === '/delivery-methods') return 'delivery-methods';
    if (path === '/quotations') return 'cotizaciones';
    if (path === '/customers') return 'clientes';
    if (path === '/cashier-collections') return 'cartera-cobros';
    if (path === '/treasury-audit') return 'treasury-audit';
    if (path === '/financial-closure') return 'financial-closure';
    if (path === '/inventory-management') return 'inventory-management';

    return 'dashboard';
  };

  const currentView = getCurrentView();

  const handleRoleChange = (roleView) => {
    navigate(roleView.path);
  };

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // IMPORTANT: Return null check AFTER hooks
  if (roleViews.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 text-white sticky top-12 md:top-0 z-20">
      <div className="px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-12 relative">

          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 z-30 h-full px-2 bg-gradient-to-r from-gray-800 to-transparent flex items-center text-white hover:text-blue-400"
            >
              <Icons.ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center space-x-1 overflow-x-auto whitespace-nowrap scrollbar-hide flex-1 pr-2 px-6"
          >
            {roleViews.map((roleView) => {
              const hasChildren = roleView.children && roleView.children.length > 0;
              const isGroupActive = hasChildren && roleView.children.some(c => currentView === c.id);
              const isActive = (currentView === roleView.id) || isGroupActive;
              const Icon = roleView.icon;

              if (hasChildren) {
                return (
                  <div key={roleView.id} className="relative">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setDropdownCoords({ left: rect.left, top: rect.bottom + 4 });
                        setActiveDropdown(activeDropdown === roleView.id ? null : roleView.id);
                      }}
                      className={`
                        dropdown-trigger flex items-center rounded-md font-medium transition-colors px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm
                        ${isActive
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {roleView.name}
                      <Icons.ChevronDown className={`w-3 h-3 ml-1 transition-transform ${activeDropdown === roleView.id ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={roleView.id}
                  onClick={() => handleRoleChange(roleView)}
                  className={`
                    flex items-center rounded-md font-medium transition-colors px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm
                    ${isActive
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                  title={roleView.description}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {roleView.name}
                </button>
              );
            })}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 md:right-auto md:left-[calc(100%-200px)] lg:right-auto lg:left-auto z-30 h-full px-2 bg-gradient-to-l from-gray-800 to-transparent flex items-center text-white hover:text-blue-400"
              style={{ right: '0' }}
            >
              <Icons.ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="hidden md:flex items-center text-sm text-gray-400 pl-2 shrink-0 border-l border-gray-700 ml-2">
            <Icons.Crown className="w-4 h-4 mr-1" />
            {(() => {
              const map = (r) => (
                r === 'admin' ? 'Administrador' :
                  r === 'facturador' ? 'Facturador' :
                    r === 'cartera' ? 'Cartera' :
                      r === 'logistica' ? 'Logística' :
                        r === 'mensajero' ? 'Mensajero' : (r === 'empacador' || r === 'empaque' ? 'Empacador' : 'Usuario')
              );
              const labels = roleNames.length ? roleNames.map(map).join(' + ') : map(user?.role);
              return <span>Vista de {labels}</span>;
            })()}
          </div>
        </div>
      </div>

      {/* Renderizado de Dropdown Fixed (fuera del contenedor scroll para evitar clipping) */}
      {activeDropdown && (
        <div
          ref={dropdownRef}
          className="fixed bg-gray-800 border border-gray-700 rounded-md shadow-2xl z-[999] overflow-hidden py-1 min-w-[220px]"
          style={{
            left: Math.min(dropdownCoords.left, window.innerWidth - 230),
            top: dropdownCoords.top
          }}
        >
          {roleViews.find(v => v.id === activeDropdown)?.children?.map(child => {
            const ChildIcon = child.icon;
            const isChildActive = currentView === child.id;
            return (
              <button
                key={child.id}
                onClick={() => {
                  handleRoleChange(child);
                  setActiveDropdown(null);
                }}
                className={`
                  flex items-center w-full px-4 py-3 text-xs sm:text-sm text-left transition-colors
                  ${isChildActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                {ChildIcon && <ChildIcon className="w-4 h-4 mr-3 opacity-80" />}
                <div className="flex flex-col">
                  <span>{child.name}</span>
                  {child.description && (
                    <span className="text-[10px] opacity-60 font-normal leading-tight">{child.description}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoleNavigation;
