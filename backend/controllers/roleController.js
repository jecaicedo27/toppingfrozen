const { query } = require('../config/database');

// Static Roles Definition (Matches existing ENUM/Strings)
const ROLES = [
    { id: 'admin', name: 'admin', display_name: 'Administrador', color: '#6366f1', description: 'Acceso total al sistema' },
    { id: 'facturador', name: 'facturador', display_name: 'Facturador', color: '#10b981', description: 'Gestión de pedidos y facturas' },
    { id: 'logistica', name: 'logistica', display_name: 'Logística', color: '#f59e0b', description: 'Gestión de envíos y despacho' },
    { id: 'cartera', name: 'cartera', display_name: 'Cartera', color: '#ef4444', description: 'Recaudo y cobros' },
    { id: 'mensajero', name: 'mensajero', display_name: 'Mensajero', color: '#8b5cf6', description: 'App móvil de entregas' },
    { id: 'gerente', name: 'gerente', display_name: 'Gerencia', color: '#3b82f6', description: 'Dashboards ejecutivos' },
    { id: 'produccion', name: 'produccion', display_name: 'Producción', color: '#ec4899', description: 'Gestión de planta' },
    { id: 'empaque', name: 'empaque', display_name: 'Empaque', color: '#14b8a6', description: 'Proceso de empaquetado' },
    { id: 'empacador', name: 'empacador', display_name: 'Empacador', color: '#14b8a6', description: 'Alias de Empaque' }
];

const PERMISSIONS = [
    { id: 'view_dashboard', display_name: 'Ver Dashboard' },
    { id: 'manage_users', display_name: 'Gestionar Usuarios' },
    { id: 'manage_orders', display_name: 'Gestionar Pedidos' }
];

// GET /api/admin/roles
const getRoles = async (req, res) => {
    res.json({ success: true, data: ROLES });
};

// GET /api/admin/permissions
const getPermissions = async (req, res) => {
    res.json({ success: true, data: PERMISSIONS });
};

// GET /api/admin/user-roles
// Generates the join table on the fly from the users table
const getUserRoles = async (req, res) => {
    try {
        const users = await query('SELECT id, role FROM users WHERE role IS NOT NULL');
        const userRoles = users.map(u => ({
            user_id: u.id,
            role_id: u.role, // String ID matching ROLES list
            is_active: 1
        }));
        res.json({ success: true, data: userRoles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// GET /api/admin/role-permissions
const getRolePermissions = async (req, res) => {
    // Mock: Give all permissions to all roles for now to prevent bugs
    const rolePermissions = [];
    ROLES.forEach(r => {
        PERMISSIONS.forEach(p => {
            rolePermissions.push({ role_id: r.id, permission_id: p.id });
        });
    });
    res.json({ success: true, data: rolePermissions });
};

// GET /api/admin/role-views
const getRoleViews = async (req, res) => {
    res.json({ success: true, data: [] });
};

// POST /api/admin/assign-role
const assignRole = async (req, res) => {
    try {
        const { user_id, role_id } = req.body;
        // Check if role is valid
        if (!ROLES.find(r => r.id === role_id)) {
            return res.status(400).json({ success: false, message: 'Invalid Role' });
        }
        await query('UPDATE users SET role = ? WHERE id = ?', [role_id, user_id]);
        res.json({ success: true, message: 'Role assigned' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// POST /api/admin/remove-role
const removeRole = async (req, res) => {
    try {
        const { user_id } = req.body;
        await query('UPDATE users SET role = NULL WHERE id = ?', [user_id]);
        res.json({ success: true, message: 'Role removed' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getRoles,
    getPermissions,
    getUserRoles,
    getRolePermissions,
    getRoleViews,
    assignRole,
    removeRole
};
