import React, { useState } from 'react';
import {
    Book, Home, ShoppingCart, Package, DollarSign,
    Users, Settings, FileText, Search, ChevronDown, ChevronRight
} from 'lucide-react';
import './UserManualPage.css';

const UserManualPage = () => {
    const [expandedSection, setExpandedSection] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const manualSections = [
        {
            id: 'intro',
            title: 'Introducción',
            icon: <Book size={20} />,
            content: [
                {
                    subtitle: 'Bienvenida',
                    text: 'El Sistema de Gestión de Pedidos Toppingfrozen es una plataforma integral para gestionar todo el ciclo operativo: pedidos, facturación, empaque, logística y control financiero.'
                },
                {
                    subtitle: 'Acceso al Sistema',
                    text: 'URL: https://apptoppingfrozen.com - Usa tus credenciales de usuario y contraseña asignadas.'
                }
            ]
        },
        {
            id: 'dashboard',
            title: 'Dashboard',
            icon: <Home size={20} />,
            content: [
                {
                    subtitle: '¿Qué es?',
                    text: 'Panel de control con métricas clave: ventas, pedidos, cartera, inventario en tiempo real.'
                },
                {
                    subtitle: '¿Quién puede usarlo?',
                    text: 'Administradores y Gerentes'
                },
                {
                    subtitle: 'Métricas Principales',
                    text: '• Ventas del día y del mes\n• Estados de pedidos (pendiente, empaque, listo)\n• Cartera por cobrar\n• Productos con stock bajo'
                }
            ]
        },
        {
            id: 'pedidos',
            title: 'Importación y Gestión de Pedidos',
            icon: <ShoppingCart size={20} />,
            content: [
                {
                    subtitle: 'Origen: Facturas SIIGO',
                    text: 'El sistema funciona importando facturas ya creadas en SIIGO. No se crean pedidos manualmente.'
                },
                {
                    subtitle: 'Cómo Importar',
                    text: '1. Ve al módulo "Facturas SIIGO".\n2. Busca la factura nueva en la lista.\n3. Haz clic en el botón azul "Importar".\n4. IMPORTANTE: En la ventana emergente, selecciona el Método de Pago y Tipo de Envío correctos. Esta decisión enviará el pedido a Cartera o Logística automáticamente.'
                },
                {
                    subtitle: 'Reglas de Ruteo Automático',
                    text: '• Si eliges CONTRAENTREGA o EFECTIVO (Local) → El pedido va directo a LOGÍSTICA.\n• Si eliges TRANSFERENCIA o CRÉDITO → El pedido se detiene en CARTERA para validación del pago o cupo.'
                },
                {
                    subtitle: 'Estados del Pedido',
                    text: '• Pendiente Facturación: Aún no importado.\n• Revisión Cartera: Esperando aprobación de pago.\n• En Empaque/Preparación: En bodega siendo alistado.\n• Listo para Entrega: Ya empacado, esperando mensajero.'
                }
            ]
        },
        {
            id: 'facturacion',
            title: 'Facturación y Cartera',
            icon: <FileText size={20} />,
            content: [
                {
                    subtitle: 'Validación de Cartera',
                    text: 'Si el pedido llegó a Cartera (ej. Transferencia), el analista debe:\n1. Verificar en el banco que el dinero entró.\n2. Aprobar el pedido → Pasa a Logística/Empaque.\n3. O Rechazar → Devuelve a revisión.'
                },
                {
                    subtitle: 'Sincronización SIIGO',
                    text: 'El sistema intenta mantener sincronizados los estados. Si una factura se anula en SIIGO, debe gestionarse manualmente la anulación en la app.'
                }
            ]
        },
        {
            id: 'cartera',
            title: 'Cartera',
            icon: <DollarSign size={20} />,
            content: [
                {
                    subtitle: 'Registrar un Pago',
                    text: '1. Ve a Cartera\n2. Busca la factura o cliente\n3. Clic en "Registrar Pago"\n4. Ingresa: monto, método (efectivo/transferencia), referencia, fecha\n5. Si es pago parcial, marca la opción\n6. Sistema actualiza saldo'
                },
                {
                    subtitle: 'Validación de Pagos',
                    text: 'Cartera recibe los pedidos que requieren validación (Transferencias, Créditos, Servicios). Debe:\n1. Verificar ingreso al banco o cupo.\n2. Aprobar el pedido para que pase a Logística.'
                },
                {
                    subtitle: 'Registrar un Pago',
                    text: '1. Ve a Cartera\n2. Busca la factura o cliente\n3. Clic en "Registrar Pago" para abonos manuales.'
                }
            ]
        },
        {
            id: 'empaque',
            title: 'Módulo de Empaque',
            icon: <Package size={20} />,
            content: [
                {
                    subtitle: 'Cola de Trabajo',
                    text: 'El empacador ve los pedidos en estado "En Preparación". El sistema ordena por prioridad.'
                },
                {
                    subtitle: 'Bloqueo de Pedidos',
                    text: 'Cuando un empacador abre un pedido, este se "Bloquea" (aparece un candado) para que nadie más lo tome al mismo tiempo.'
                },
                {
                    subtitle: 'Verificación de Items (100%)',
                    text: 'Es obligatorio verificar cada producto:\n1. Escanea el código de barras o marca manualmente el check.\n2. La barra de progreso avanza.\n3. NO deja finalizar hasta completar el 100% de los items.'
                },
                {
                    subtitle: 'Cierre de Empaque',
                    text: 'Al alcanzar el 100%, toma la foto de evidencia (Obligatoria) y finaliza. El pedido pasa automáticamente a "Listo para Entrega".'
                }
            ]
        },
        {
            id: 'egresos',
            title: 'Control de Egresos',
            icon: <DollarSign size={20} />,
            content: [
                {
                    subtitle: 'Registro de Gastos',
                    text: 'Permite registrar salidas de dinero de caja menor o cuentas bancarias.'
                },
                {
                    subtitle: 'Categorías',
                    text: 'Selecciona la categoría (fletes, servicios, nómina, etc.) para mantener la contabilidad organizada.'
                }
            ]
        },
        {
            id: 'inventario',
            title: 'Inventario',
            icon: <Package size={20} />,
            content: [
                {
                    subtitle: 'Crear Producto',
                    text: '1. Clic en "+ Nuevo Producto"\n2. Completa: nombre, código, categoría, precio, stock\n3. Integración SIIGO: código SIIGO y cuenta contable\n4. Guardar'
                },
                {
                    subtitle: 'Ajustar Stock',
                    text: '1. Busca producto\n2. Clic en icono inventario\n3. Selecciona: Entrada/Salida/Ajuste\n4. Ingresa cantidad, motivo, observación\n5. Sistema actualiza'
                },
                {
                    subtitle: 'Recepción de Mercancía',
                    text: 'Para registrar entradas por compras:\n1. "Nueva Recepción"\n2. Tipo: Compra/Producción/Ajuste\n3. Datos proveedor y factura\n4. Agregar productos con cantidad\n5. Confirmar → aumenta stock'
                }
            ]
        },
        {
            id: 'usuarios',
            title: 'Gestión de Usuarios',
            icon: <Users size={20} />,
            content: [
                {
                    subtitle: 'Crear Usuario',
                    text: '1. Usuarios → "+ Nuevo Usuario"\n2. Nombre, email, rol, contraseña\n3. Guardar\n4. Comunicar credenciales al usuario'
                },
                {
                    subtitle: 'Cambiar Rol',
                    text: '1. Busca usuario\n2. Clic en editar (lápiz)\n3. Selecciona nuevo rol\n4. Actualizar\n5. Usuario ve cambios al reiniciar sesión'
                },
                {
                    subtitle: 'Roles Disponibles',
                    text: '• Admin: Acceso total\n• Ventas: Pedidos y clientes\n• Empacador: Solo empaque\n• Logística: Entregas y guías\n• Contador: Facturación y cartera'
                }
            ]
        },
        {
            id: 'siigo',
            title: 'Integración SIIGO',
            icon: <Settings size={20} />,
            content: [
                {
                    subtitle: 'Sincronizar Clientes',
                    text: '1. Ve a Clientes\n2. Clic en "Actualizar desde SIIGO"\n3. Sistema descarga y guarda clientes\n4. Proceso puede tomar varios minutos'
                },
                {
                    subtitle: 'Sincronizar Productos',
                    text: '1. Módulo Productos\n2. Botón "Sincronizar con SIIGO"\n3. Actualiza catálogo automáticamente'
                },
                {
                    subtitle: 'Configurar Credenciales',
                    text: '1. Config Empresa → SIIGO\n2. Ingresa: Usuario SIIGO y Access Key\n3. "Probar Conexión"\n4. Si es exitoso (verde), guardar'
                },
                {
                    subtitle: 'Problemas Comunes',
                    text: '• Error de autenticación → Verifica usuario y Access Key\n• Producto no sincronizado → Créalo en SIIGO primero\n• Factura no se generó → "Reintentar" en Facturas SIIGO'
                }
            ]
        },
        {
            id: 'faq',
            title: 'Preguntas Frecuentes',
            icon: <Search size={20} />,
            content: [
                {
                    subtitle: 'Sesión y Acceso',
                    text: 'P: ¿Olvidé mi contraseña?\nR: Clic en "¿Olvidaste tu contraseña?" y sigue instrucciones.\n\nP: ¿Puedo acceder desde celular?\nR: Sí, usa navegador móvil con la misma URL.'
                },
                {
                    subtitle: 'Pedidos',
                    text: 'P: ¿Puedo editar pedido facturado?\nR: No, debes anular factura primero (requiere admin).\n\nP: ¿Cómo anulo un pedido?\nR: Abrir pedido → "Anular" → Ingresar motivo → Confirmar.'
                },
                {
                    subtitle: 'Inventario',
                    text: 'P: ¿Cómo sé si hay stock bajo?\nR: Dashboard muestra alertas. También en módulo Productos.\n\nP: ¿Puedo hacer inventario físico?\nR: Sí, hay opción "Ajuste Masivo" en Inventario.'
                }
            ]
        }
    ];

    const toggleSection = (sectionId) => {
        setExpandedSection(expandedSection === sectionId ? null : sectionId);
    };

    const filteredSections = manualSections.filter(section =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.content.some(item =>
            item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.text.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="user-manual-page">
            <div className="manual-header">
                <div className="manual-title">
                    <Book size={32} />
                    <div>
                        <h1>Manual de Usuario</h1>
                        <p>Sistema de Gestión de Pedidos Toppingfrozen</p>
                    </div>
                </div>

                <div className="manual-search">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar en el manual..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="manual-content">
                <div className="manual-sections">
                    {filteredSections.map((section) => (
                        <div key={section.id} className="manual-section">
                            <div
                                className="section-header"
                                onClick={() => toggleSection(section.id)}
                            >
                                <div className="section-title">
                                    {section.icon}
                                    <span>{section.title}</span>
                                </div>
                                {expandedSection === section.id ? (
                                    <ChevronDown size={20} />
                                ) : (
                                    <ChevronRight size={20} />
                                )}
                            </div>

                            {expandedSection === section.id && (
                                <div className="section-content">
                                    {section.content.map((item, index) => (
                                        <div key={index} className="content-item">
                                            <h4>{item.subtitle}</h4>
                                            <p style={{ whiteSpace: 'pre-line' }}>{item.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="manual-sidebar">
                    <div className="sidebar-card">
                        <h3>📖 Versión del Manual</h3>
                        <p>v1.0 - Enero 2026</p>
                    </div>

                    <div className="sidebar-card">
                        <h3>📞 Soporte</h3>
                        <p>Email: soporte@toppingfrozen.com</p>
                        <p>Lunes a Viernes</p>
                        <p>8:00 AM - 6:00 PM</p>
                    </div>

                    <div className="sidebar-card">
                        <h3>💡 Consejos Rápidos</h3>
                        <ul>
                            <li>Usa los filtros para encontrar información rápido</li>
                            <li>Las capturas de pantalla ayudan en reportes</li>
                            <li>Documenta bien las observaciones</li>
                            <li>Sincroniza SIIGO regularmente</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="manual-footer">
                <p>© 2026 Toppingfrozen. Sistema de Gestión de Pedidos.</p>
                <p>Para uso interno de empleados autorizados.</p>
            </div>
        </div>
    );
};

export default UserManualPage;
