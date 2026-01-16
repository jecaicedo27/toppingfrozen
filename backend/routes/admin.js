const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const roleController = require('../controllers/roleController');

// Todas las rutas requieren autenticación y rol de admin
// router.use(auth.authenticateToken);
// router.use(auth.verifyRole(['admin'])); 
// NOTA: Por ahora permitimos acceso para desarrollo, luego descomentar seguridad estricta

// RUTAS DE GESTIÓN DE ROLES Y USUARIOS
router.get('/users', auth.authenticateToken, auth.verifyRole(['admin']), userController.getUsers);
router.delete('/users/:id', auth.authenticateToken, auth.verifyRole(['admin']), userController.deleteUser); // Alias for convenience

router.get('/roles', auth.authenticateToken, roleController.getRoles);
router.get('/permissions', auth.authenticateToken, roleController.getPermissions);
router.get('/user-roles', auth.authenticateToken, roleController.getUserRoles);
router.get('/role-permissions', auth.authenticateToken, roleController.getRolePermissions);
router.get('/role-views', auth.authenticateToken, roleController.getRoleViews);
router.post('/assign-role', auth.authenticateToken, auth.verifyRole(['admin']), roleController.assignRole);
router.post('/remove-role', auth.authenticateToken, auth.verifyRole(['admin']), roleController.removeRole);

// ESTADÍSTICAS

router.get(
    '/executive-stats',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']), // Asumiendo rol 'gerente' o solo 'admin'
    adminController.getExecutiveStats
);

router.get(
    '/advanced-stats',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getAdvancedStats
);


router.get(
    '/cluster/:clusterType/customers',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getClusterCustomers
);

router.get(
    '/shipping-stats',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getShippingStats
);

router.get(
    '/category-stats',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getCategoryStats
);

router.get(
    '/category-trend',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getCategoryTrend
);

router.get(
    '/category-profitability-trend',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getCategoryProfitabilityTrend
);

router.get(
    '/profitability-trend',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getProfitabilityTrend
);

router.get(
    '/inventory-value-history',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getInventoryValueHistory
);

router.get(
    '/inventory-turnover-history',
    auth.authenticateToken,
    auth.verifyRole(['admin', 'gerente']),
    adminController.getInventoryTurnoverHistory
);

module.exports = router;
