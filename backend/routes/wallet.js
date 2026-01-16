const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');
const walletController = require('../controllers/walletController');
const settingsController = require('../controllers/settingsController');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener información de crédito de un cliente
router.get('/customer-credit/:customerName',
  verifyRole(['cartera', 'admin']),
  walletController.getCustomerCredit
);

// Validar pago y enviar a logística
router.post('/validate-payment',
  verifyRole(['cartera', 'admin', 'facturador']),
  walletController.validatePayment
);

// Validar pago POS
router.post('/validate-pos-payment',
  verifyRole(['cartera', 'admin', 'facturador']),
  walletController.validatePosPayment
);

// Obtener historial de validaciones de un pedido
router.get('/validation-history/:orderId',
  verifyRole(['cartera', 'admin']),
  walletController.getValidationHistory
);

// Obtener lista de clientes con crédito
router.get('/credit-customers',
  verifyRole(['cartera', 'admin']),
  walletController.getCreditCustomers
);

// Crear o actualizar cliente con crédito
router.post('/credit-customers',
  verifyRole(['cartera', 'admin']),
  walletController.upsertCreditCustomer
);

// Obtener pedidos pendientes de validación en cartera
router.get('/orders',
  verifyRole(['cartera', 'admin']),
  walletController.getWalletOrders
);

// Obtener estadísticas de cartera
router.get('/stats',
  verifyRole(['cartera', 'admin']),
  walletController.getWalletStats
);

// Nueva ruta: Forzar refresco de saldos SIIGO para un cliente
router.post('/refresh-balance/:customerNit',
  verifyRole(['cartera', 'admin']),
  async (req, res) => {
    try {
      const { customerNit } = req.params;
      const siigoRefreshService = require('../services/siigoRefreshService');

      console.log(`🔄 [ROUTE] Forzando refresco de saldos para NIT: ${customerNit}`);

      const siigoData = await siigoRefreshService.getCustomerBalanceWithRefresh(customerNit, true);

      res.json({
        success: true,
        data: siigoData,
        message: 'Saldos refrescados exitosamente desde SIIGO'
      });

    } catch (error) {
      console.error('❌ Error en refresco forzado SIIGO:', error);
      res.status(500).json({
        success: false,
        message: 'Error refrescando saldos SIIGO',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Nueva ruta: Refresco masivo de todos los clientes activos
router.post('/refresh-all',
  verifyRole(['admin']),
  async (req, res) => {
    try {
      const siigoRefreshService = require('../services/siigoRefreshService');

      console.log('🔄 [ROUTE] Iniciando refresco masivo de clientes');

      const results = await siigoRefreshService.refreshAllActiveCustomers();

      res.json({
        success: true,
        data: results,
        message: `Refresco masivo completado: ${results.length} clientes procesados`
      });

    } catch (error) {
      console.error('❌ Error en refresco masivo:', error);
      res.status(500).json({
        success: false,
        message: 'Error en refresco masivo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Nueva ruta: Detectar nuevas facturas en SIIGO
router.get('/detect-new-invoices',
  verifyRole(['cartera', 'admin']),
  async (req, res) => {
    try {
      const { since } = req.query;
      const siigoRefreshService = require('../services/siigoRefreshService');

      console.log('🔍 [ROUTE] Detectando nuevas facturas en SIIGO');

      const sinceDate = since ? new Date(since) : new Date(Date.now() - 10 * 60 * 1000);
      const newInvoices = await siigoRefreshService.detectNewInvoices(sinceDate);

      res.json({
        success: true,
        data: newInvoices,
        message: `${newInvoices.length} nuevas facturas encontradas`
      });

    } catch (error) {
      console.error('❌ Error detectando nuevas facturas:', error);
      res.status(500).json({
        success: false,
        message: 'Error detectando nuevas facturas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);



// Rutas para gestión de múltiples comprobantes
router.post('/payment-evidences',
  verifyToken,
  verifyRole(['cartera', 'admin', 'facturador']),
  walletController.uploadPaymentEvidences
);

router.get('/payment-evidences/:orderId',
  verifyToken,
  verifyRole(['cartera', 'admin', 'facturador']),
  walletController.getPaymentEvidences
);

router.delete('/payment-evidences/:id',
  verifyToken,
  verifyRole(['cartera', 'admin']),
  walletController.deletePaymentEvidence
);


// Gestión de Credenciales Bancolombia (Solo Admin/Cartera)
router.post('/bancolombia-credentials',
  verifyRole(['cartera', 'admin']),
  settingsController.saveBancolombiaCredentials
);

router.get('/bancolombia-credentials',
  verifyRole(['cartera', 'admin']),
  settingsController.getBancolombiaCredentialsStatus
);

// 1. Request Sync (Web -> Server)
router.post('/sync-bancolombia/request',
  verifyRole(['cartera', 'admin']),
  walletController.requestSyncBancolombia
);

// 2. Poll Status (Web -> Server)
router.get('/sync-bancolombia/status',
  verifyRole(['cartera', 'admin']),
  walletController.getSyncStatus
);

// 3. Agent Poll (Local PC -> Server) - Public or Basic Auth (Open for MVP as requested by user env)
// We remove verifyToken/Role because the script runs outside the browser context
router.post('/sync-bancolombia/poll-job',
  // verifyToken, // Disabled for Agent
  walletController.pollSyncJob
);

// 4. Agent Upload (Local PC -> Server)
const upload = require('../middleware/upload'); // Ensure upload middleware is available or import it
router.post('/sync-bancolombia/upload-result',
  // verifyToken, // Disabled for Agent
  upload.single('file'), // Multer middleware
  walletController.uploadSyncResult
);

module.exports = router;
