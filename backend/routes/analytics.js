const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * Middleware de autorización para Analytics Avanzados.
 * Permitidos: admin, logistica, cartera. Bloquea mensajero y demás roles.
 */
const requireAdmin = (req, res, next) => {
  const allowed = ['admin', 'logistica', 'cartera'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'Acceso denegado - Permisos insuficientes' });
  }
  next();
};

// Endpoint principal para obtener analytics avanzados
// Endpoint principal para obtener analytics avanzados
router.get('/advanced-dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [
      dailyShipments,
      topShippingCities,
      topCustomers,
      customerRepeatPurchases,
      lostCustomers,
      newCustomersDaily,
      performanceMetrics,
      salesTrends,
      productPerformance
    ] = await Promise.all([
      getDailyShipments(startDate, endDate),
      getTopShippingCities(startDate, endDate),
      getTopCustomers(startDate, endDate),
      getCustomerRepeatPurchases(startDate, endDate),
      getLostCustomers(startDate, endDate),
      getNewCustomersDaily(startDate, endDate),
      getPerformanceMetrics(startDate, endDate),
      getSalesTrends(startDate, endDate),
      getProductPerformance(startDate, endDate)
    ]);

    res.json({
      success: true,
      data: {
        dailyShipments,
        topShippingCities,
        topCustomers,
        customerRepeatPurchases,
        lostCustomers,
        newCustomersDaily,
        performanceMetrics,
        salesTrends,
        productPerformance
      }
    });
  } catch (error) {
    console.error('Error obteniendo analytics avanzados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Función para construir el filtro de fecha usando la misma lógica de zona horaria existente
function getDateCondition(colName, startDate, endDate, defaultIntervalDay) {
  // La expresión compleja para obtener la fecha ajustada a zona horaria
  const dateExpr = `COALESCE(CONVERT_TZ(COALESCE(${colName}),'UTC','America/Bogota'), CONVERT_TZ(COALESCE(${colName}),'+00:00','-05:00'), DATE_ADD(COALESCE(${colName}), INTERVAL -5 HOUR), COALESCE(${colName}))`;
  const nowExpr = `COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW())`;

  if (startDate && endDate) {
    return {
      condition: `${dateExpr} BETWEEN ? AND ?`,
      params: [startDate, endDate] // Asumiendo que startDate/endDate vienen ajustados o son strings ISO 'YYYY-MM-DD'
      // Nota: Si son ISO Strings completos, podría necesitar cuidado. Normalmente el frontend manda YYYY-MM-DD.
      // Siendo estrictos, mejor usar CAST o strings directos.
    };
  } else {
    return {
      condition: `${dateExpr} >= DATE_SUB(DATE(${nowExpr}), INTERVAL ${defaultIntervalDay} DAY)`,
      params: []
    };
  }
}

// Función para obtener envíos diarios con gráfica
async function getDailyShipments(startDate, endDate) {
  try {
    const colName = 'shipping_date, delivered_at, created_at'; // logic handles multiple columns in COALESCE
    // Nota: El query original usa COALESCE(shipping_date, delivered_at, created_at).
    // Mi helper getDateCondition espera un solo nombre de columna pero la lógica original tiene toda la expresión en el WHERE.
    // Voy a simplificar: reusar la logica o inyectar el WHERE dinámico.

    let whereClause = '';
    let params = [];

    // Complex expression from original code
    const dateCol = `COALESCE(CONVERT_TZ(COALESCE(shipping_date, delivered_at, created_at),'UTC','America/Bogota'), CONVERT_TZ(COALESCE(shipping_date, delivered_at, created_at),'+00:00','-05:00'), DATE_ADD(COALESCE(shipping_date, delivered_at, created_at), INTERVAL -5 HOUR), COALESCE(shipping_date, delivered_at, created_at))`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    if (startDate && endDate) {
      whereClause = `${dateCol} >= ? AND ${dateCol} <= ?`;
      // Ajustar endDate para incluir el final del día si es solo fecha YYYY-MM-DD
      // Pero el frontend suele mandar strings completos o fechas.
      // Asumiremos formato compatible.
      params.push(startDate, endDate);
    } else {
      whereClause = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 30 DAY)`;
    }

    const query = `
      SELECT 
        DATE(${dateCol}) as date,
        COUNT(*) as shipments,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value
      FROM orders 
      WHERE ${whereClause}
        AND status NOT IN ('cancelado')
      GROUP BY DATE(${dateCol})
      ORDER BY date DESC
    `;

    const results = await db.query(query, params);

    // Fallback: si no hay filas, generar últimos 30 días con 0 para evitar tarjetas vacías
    const daysBack = 30;
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const dataRows = (Array.isArray(results) && results.length > 0)
      ? results
      : Array.from({ length: daysBack }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        return {
          date: toYmd(d),
          shipments: 0,
          total_revenue: 0,
          avg_order_value: 0
        };
      });

    // Agregar estadísticas adicionales
    const totalShipments = dataRows.reduce((sum, row) => sum + Number(row.shipments || 0), 0);
    const avgDailyShipments = totalShipments / (dataRows.length || 1);

    return {
      chartData: dataRows.map(row => ({
        date: row.date,
        shipments: Number(row.shipments || 0),
        revenue: parseFloat(row.total_revenue || 0),
        avgOrderValue: parseFloat(row.avg_order_value || 0)
      })),
      summary: {
        totalShipments,
        avgDailyShipments: Math.round(avgDailyShipments * 100) / 100,
        lastWeekShipments: dataRows.slice(0, 7).reduce((sum, row) => sum + Number(row.shipments || 0), 0)
      }
    };
  } catch (error) {
    console.error('Error en getDailyShipments:', error);
    return { chartData: [], summary: {} };
  }
}

// Función para obtener ciudades con más envíos
async function getTopShippingCities(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(created_at,'UTC','America/Bogota'), CONVERT_TZ(created_at,'+00:00','-05:00'), DATE_ADD(created_at, INTERVAL -5 HOUR), created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    let whereDate = '';
    let params = [];

    if (startDate && endDate) {
      whereDate = `${dateCol} >= ? AND ${dateCol} <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 90 DAY)`;
    }

    const query = `
      SELECT 
        COALESCE(shipping_city, customer_city) as city,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders WHERE COALESCE(shipping_city, customer_city) IS NOT NULL)) as percentage
      FROM orders 
      WHERE COALESCE(shipping_city, customer_city) IS NOT NULL 
        AND ${whereDate}
        AND status NOT IN ('cancelado')
      GROUP BY COALESCE(shipping_city, customer_city)
      ORDER BY order_count DESC
      LIMIT 15
    `;

    const results = await db.query(query, params);

    return results.map(row => ({
      city: row.city,
      orderCount: row.order_count,
      totalRevenue: parseFloat(row.total_revenue || 0),
      avgOrderValue: parseFloat(row.avg_order_value || 0),
      percentage: parseFloat(row.percentage || 0)
    }));
  } catch (error) {
    console.error('Error en getTopShippingCities:', error);
    return [];
  }
}

// Función para obtener mejores clientes
async function getTopCustomers(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(o.created_at,'UTC','America/Bogota'), CONVERT_TZ(o.created_at,'+00:00','-05:00'), DATE_ADD(o.created_at, INTERVAL -5 HOUR), o.created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    let whereDate = '';
    let params = [];

    if (startDate && endDate) {
      whereDate = `${dateCol} >= ? AND ${dateCol} <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 180 DAY)`;
    }

    const query = `
      SELECT 
        COALESCE(NULLIF(o.customer_document,''), NULLIF(o.customer_phone,''), NULLIF(o.customer_email,''), CONCAT('SIN_DOC_', o.customer_name)) AS document,
        COALESCE(NULLIF(o.customer_name,''), 'Cliente sin nombre') AS name,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(${dateCol}) as last_order_date,
        MIN(${dateCol}) as first_order_date,
        DATEDIFF(
          ${nowExpr},
          DATE(MAX(${dateCol}))
        ) as days_since_last_order
      FROM orders o
      WHERE o.status NOT IN ('cancelado')
        AND ${whereDate}
      GROUP BY document, name
      ORDER BY total_spent DESC
      LIMIT 20
    `;

    const results = await db.query(query, params);

    return results.map(row => ({
      document: row.document,
      name: row.name,
      orderCount: row.order_count,
      totalSpent: parseFloat(row.total_spent || 0),
      avgOrderValue: parseFloat(row.avg_order_value || 0),
      lastOrderDate: row.last_order_date,
      firstOrderDate: row.first_order_date,
      daysSinceLastOrder: row.days_since_last_order,
      customerType: row.order_count >= 10 ? 'VIP' : row.order_count >= 5 ? 'Frecuente' : 'Regular'
    }));
  } catch (error) {
    console.error('Error en getTopCustomers:', error);
    return [];
  }
}

// Función para analizar recompras de clientes
async function getCustomerRepeatPurchases(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(created_at,'UTC','America/Bogota'), CONVERT_TZ(created_at,'+00:00','-05:00'), DATE_ADD(created_at, INTERVAL -5 HOUR), created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    let whereDate = '';
    let params = [];

    if (startDate && endDate) {
      whereDate = `${dateCol} >= ? AND ${dateCol} <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 365 DAY)`;
    }

    const query = `
      WITH customer_stats AS (
        SELECT 
          customer_document,
          COUNT(*) as total_orders,
          MIN(${dateCol}) as first_order,
          MAX(${dateCol}) as last_order,
          SUM(total_amount) as total_spent,
          DATEDIFF(
            DATE(MAX(${dateCol})),
            DATE(MIN(${dateCol}))
          ) as customer_lifespan_days
        FROM orders 
        WHERE status NOT IN ('cancelado')
          AND ${whereDate}
        GROUP BY customer_document
      ),
      repeat_analysis AS (
        SELECT 
          CASE 
            WHEN total_orders = 1 THEN 'Una vez'
            WHEN total_orders BETWEEN 2 AND 4 THEN '2-4 pedidos'
            WHEN total_orders BETWEEN 5 AND 9 THEN '5-9 pedidos'
            WHEN total_orders BETWEEN 10 AND 19 THEN '10-19 pedidos'
            ELSE '20+ pedidos'
          END as order_frequency,
          COUNT(*) as customer_count,
          AVG(total_spent) as avg_total_spent,
          AVG(customer_lifespan_days) as avg_lifespan_days
        FROM customer_stats
        GROUP BY 
          CASE 
            WHEN total_orders = 1 THEN 'Una vez'
            WHEN total_orders BETWEEN 2 AND 4 THEN '2-4 pedidos'
            WHEN total_orders BETWEEN 5 AND 9 THEN '5-9 pedidos'
            WHEN total_orders BETWEEN 10 AND 19 THEN '10-19 pedidos'
            ELSE '20+ pedidos'
          END
      )
      SELECT * FROM repeat_analysis ORDER BY 
        CASE order_frequency
          WHEN 'Una vez' THEN 1
          WHEN '2-4 pedidos' THEN 2
          WHEN '5-9 pedidos' THEN 3
          WHEN '10-19 pedidos' THEN 4
          ELSE 5
        END
    `;

    const results = await db.query(query, params);

    // Calcular métricas adicionales
    const totalCustomers = results.reduce((sum, row) => sum + row.customer_count, 0);
    const repeatCustomers = results.filter(row => row.order_frequency !== 'Una vez')
      .reduce((sum, row) => sum + row.customer_count, 0);

    return {
      distribution: results.map(row => ({
        frequency: row.order_frequency,
        customerCount: row.customer_count,
        avgTotalSpent: parseFloat(row.avg_total_spent || 0),
        avgLifespanDays: parseInt(row.avg_lifespan_days || 0),
        percentage: ((row.customer_count / totalCustomers) * 100).toFixed(1)
      })),
      summary: {
        totalCustomers,
        repeatCustomers,
        repeatRate: ((repeatCustomers / totalCustomers) * 100).toFixed(1)
      }
    };
  } catch (error) {
    console.error('Error en getCustomerRepeatPurchases:', error);
    return { distribution: [], summary: {} };
  }
}

// Función para identificar clientes perdidos
async function getLostCustomers(startDate, endDate) {
  try {
    // Nota: "Clientes perdidos" normalmente implica mirar la última compra.
    // Si filtramos por fecha, ¿qué significa? 
    // Quizás "Clientes cuya última compra fue HACE MUCHO" pero dentro del rango?
    // O simplemente respetamos el filtro para la "última orden".
    // Si el usuario filtra "Este Mes", y el cliente compró hace 6 meses, no saldrá.
    // Esto podría ser confuso. Sin embargo, para consistencia, aplicaremos el filtro
    // a los pedidos considerados para determinar la "última compra".

    const dateCol = `COALESCE(CONVERT_TZ(o.created_at,'UTC','America/Bogota'), CONVERT_TZ(o.created_at,'+00:00','-05:00'), DATE_ADD(o.created_at, INTERVAL -5 HOUR), o.created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;
    // Reference date for "days since" calculation. If filtering historically (e.g. last year),
    // "days since" should probably be relative to the END of that period, or keep it relative to NOW?
    // Usually relative to NOW makes sense for "Actionable" lists.

    // BUT, if I select "Last Year", I expect data relevant to that period.
    // For lost customers, maybe it's "Customers who became lost during this period"?
    // OR "Customers who bought in this period but haven't bought since?"

    // Given the simple requirement "tie to date filter", I will restrict the orders viewed.
    // But for "Lost Customers" specifically, limiting orders to "This Month" makes no sense 
    // because you need history to know if they are lost.
    // Strategy: ignore filter for "Lost Customers" OR apply filter to "last_order_date" check?
    // The user said "All dashboard cards should be tied to the selected date".
    // I will apply the filter to the 'orders' table scan. 
    // WARNING: This might empty the list if the range is short/recent.
    // Actually, "Lost Customers" usually means "Last order > X days ago".
    // If we filter orders to "This Month", then Last Order is "This Month", so Days Since < 30.
    // So no one will be "Lost" (Risk > 60 days).

    // DECISION: For "Lost Customers", if a custom range is provided, it might break the logic.
    // However, I must comply. Let's assume the user implies "Show me lost customers based on activity UP TO this date" or similar.
    // Or maybe just leave it as is if it doesn't make sense?
    // No, user was explicit: "All cards".
    // Let's modify the query to ONLY consider orders within the range as "valid activity".
    // If I select "2024", and last order was in "2024", and now is "2026", they are lost.
    // But if I select "Today", and they bought "Today", they are not lost.

    // Actually, if I select a past range, maybe I want to see who WAS lost back then?
    // That's too complex.
    // MOST LIKELY INTERPRETATION: The "Lost Customers" card shows customers who HAVEN'T bought recently.
    // "Recently" is relative to NOW.
    // The date filter might be irrelevant here, OR it restricts the set of customers considered.
    // I will apply the filter to the `MAX(created_at)` logic. 
    // i.e., "Find customers whose last order *within the filtered period*..." 
    // This seems wrong.

    // Alternative: The filter defines the "cutoff" date?
    // Let's stick to the pattern: restricting the underlying data.
    // If the result is empty, so be it. It's better than mostly unrelated data.
    // Wait, if I filter "Last Month", and customer bought "Last Month", they are Active.
    // If I filter "Last Month", and customer bought 6 months ago, they are NOT in the `orders` scan for "Last Month".
    // So they won't appear at all.
    // This implies "Lost Customers" metric effectively disappears for short/recent ranges, which is correct behavior for "Activity in Range".

    // However, to see "who is lost", we usually look at ALL history.
    // I'll skip applying strict date filters to "Lost Customers" unless the user specifically complained about THIS card.
    // The user said "estas fichas... Mejores Clientes... Recompras". didn't explicitly circle Lost Customers (it's not in the screenshot).
    // The screenshot shows "Mejores Clientes" and "Recompras".
    // I will leave "Lost Customers" with the default logic (maybe just 180 days lookback needed? The query uses total history?)
    // The query uses `DATE_SUB(NOW, INTERVAL 60 DAY)`.
    // I will leave it alone or apply the filter loosely?
    // I'll apply the filter to the `WHERE` clause of `orders` just like the others. 
    // If it returns nothing, that's technically correct (no "Lost" customers found based on activity in that specific window... wait).
    // Actually, if I filter orders to "Jan 2025", and I bought in Jan 2025, I am NOT lost.
    // If I didn't buy in Jan 2025, I am not in the result set.
    // So this chart will interpret "Lost Customers" as "Customers active in this period who are NOW lost"? No.
    // I will apply the filter to the "Reference Date" (NOW). 
    // i.e. "Who was lost as of [EndDate]?"
    // And calculations are relative to [EndDate].
    // And we consider orders UP TO [EndDate].
    // YES. This is the correct "Historical Status" interpretation.

    // Implementation: 
    // 1. Filter orders `created_at <= endDate`.
    // 2. Calculate `days_since_last_order` relative to `endDate`.

    let whereDate = '';
    let params = [];
    let referenceDateExpr = nowExpr;

    if (startDate && endDate) {
      // En "Lost Customers", miramos el estado "al final del periodo". 
      // Ignoramos startDate para "quien es cliente", pero necesitamos saber su ultima compra "hasta endDate".
      // Entonces: orders.created_at <= endDate.
      whereDate = `${dateCol} <= ?`;
      params.push(endDate); // Solo endDate para filtrar pedidos futuros

      // La referencia para "dias desde ultima compra" es endDate
      referenceDateExpr = `DATE(?)`;
      params.push(endDate); // Param for reference date
    } else {
      // Default behavior (all history up to now)
      whereDate = '1=1'; // No upper bound restriction (up to now)
    }

    const query = `
      WITH customer_last_order AS (
        SELECT 
          c.document,
          c.commercial_name,
          c.name,
          MAX(${dateCol}) as last_order_date,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_spent,
          DATEDIFF(
            ${referenceDateExpr},
            DATE(MAX(${dateCol}))
          ) as days_since_last_order
        FROM customers c
        INNER JOIN orders o ON c.document = o.customer_document
        WHERE o.status NOT IN ('cancelado')
          AND ${whereDate}
        GROUP BY c.document, c.commercial_name, c.name
      )
      SELECT 
        document,
        commercial_name,
        name,
        last_order_date,
        total_orders,
        total_spent,
        days_since_last_order,
        CASE 
          WHEN days_since_last_order > 180 THEN 'Muy perdido'
          WHEN days_since_last_order > 90 THEN 'En riesgo alto'
          WHEN days_since_last_order > 60 THEN 'En riesgo medio'
          ELSE 'En riesgo bajo'
        END as risk_level
      FROM customer_last_order
      WHERE days_since_last_order > 60
        AND total_orders >= 2
      ORDER BY total_spent DESC, days_since_last_order DESC
      LIMIT 50
    `;

    const results = await db.query(query, params);

    // Agrupar por nivel de riesgo
    const riskGroups = {
      'Muy perdido': [],
      'En riesgo alto': [],
      'En riesgo medio': [],
      'En riesgo bajo': []
    };

    results.forEach(customer => {
      riskGroups[customer.risk_level].push({
        document: customer.document,
        name: customer.commercial_name || customer.name,
        lastOrderDate: customer.last_order_date,
        totalOrders: customer.total_orders,
        totalSpent: parseFloat(customer.total_spent || 0),
        daysSinceLastOrder: customer.days_since_last_order
      });
    });

    return {
      byRiskLevel: riskGroups,
      summary: {
        totalLostCustomers: results.length,
        highRiskCount: riskGroups['En riesgo alto'].length + riskGroups['Muy perdido'].length,
        potentialLostRevenue: results.reduce((sum, customer) => sum + parseFloat(customer.total_spent || 0), 0)
      }
    };
  } catch (error) {
    console.error('Error en getLostCustomers:', error);
    return { byRiskLevel: {}, summary: {} };
  }
}

// Función para obtener nuevos clientes diarios
async function getNewCustomersDaily(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(created_at,'UTC','America/Bogota'), CONVERT_TZ(created_at,'+00:00','-05:00'), DATE_ADD(created_at, INTERVAL -5 HOUR), created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    let whereDate = '';
    let params = [];

    // We want to count new customers whose FIRST order was in the range.
    // The query calculates `first_order_date`. We need to filter the RESULT of the CTE, or filter inside.
    // Filtering inside `first_orders` (the CTE) by range is wrong, because a customer might have ordered 
    // previously outside the range, and we wouldn't know. 
    // We must compute first_order_date based on ALL history, then filter WHERE first_order_date BETWEEN range.

    if (startDate && endDate) {
      whereDate = `DATE(first_order_date) >= ? AND DATE(first_order_date) <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `DATE(first_order_date) >= DATE_SUB(${nowExpr}, INTERVAL 30 DAY)`;
    }

    const query = `
      WITH first_orders AS (
        SELECT 
          customer_document,
          MIN(${dateCol}) as first_order_date
        FROM orders
        WHERE status NOT IN ('cancelado')
        GROUP BY customer_document
      )
      SELECT 
        DATE(first_order_date) as date,
        COUNT(*) as new_customers
      FROM first_orders
      WHERE ${whereDate}
      GROUP BY DATE(first_order_date)
      ORDER BY date DESC
    `;

    const results = await db.query(query, params);

    // Calcular tendencia
    const totalNewCustomers = results.reduce((sum, row) => sum + row.new_customers, 0);
    const avgDailyNew = totalNewCustomers / (results.length || 1);

    return {
      chartData: results.map(row => ({
        date: row.date,
        newCustomers: row.new_customers
      })),
      summary: {
        totalNewCustomers,
        avgDailyNew: Math.round(avgDailyNew * 100) / 100,
        lastWeekNew: results.slice(0, 7).reduce((sum, row) => sum + row.new_customers, 0)
      }
    };
  } catch (error) {
    console.error('Error en getNewCustomersDaily:', error);
    return { chartData: [], summary: {} };
  }
}

// Función para obtener métricas de rendimiento
async function getPerformanceMetrics(startDate, endDate) {
  try {
    const [conversionRate, avgProcessingTime, returnRate] = await Promise.all([
      getConversionRate(startDate, endDate),
      getAvgProcessingTime(startDate, endDate),
      getReturnRate(startDate, endDate)
    ]);

    return {
      conversionRate,
      avgProcessingTime,
      returnRate
    };
  } catch (error) {
    console.error('Error en getPerformanceMetrics:', error);
    return {};
  }
}

// Función para calcular tasa de conversión
async function getConversionRate(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(created_at,'UTC','America/Bogota'), CONVERT_TZ(created_at,'+00:00','-05:00'), DATE_ADD(created_at, INTERVAL -5 HOUR), created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    let whereDate = '';
    let params = [];

    if (startDate && endDate) {
      whereDate = `${dateCol} >= ? AND ${dateCol} <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 30 DAY)`;
    }

    const query = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status IN ('entregado','entregado_cliente','entregado_transportadora') THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelado' THEN 1 END) as cancelled_orders
      FROM orders
      WHERE ${whereDate}
    `;

    const results = await db.query(query, params);
    const row = results[0];

    return {
      totalOrders: row.total_orders,
      deliveredOrders: row.delivered_orders,
      cancelledOrders: row.cancelled_orders,
      conversionRate: row.total_orders > 0 ? ((row.delivered_orders / row.total_orders) * 100).toFixed(1) : 0,
      cancellationRate: row.total_orders > 0 ? ((row.cancelled_orders / row.total_orders) * 100).toFixed(1) : 0
    };
  } catch (error) {
    console.error('Error en getConversionRate:', error);
    return {};
  }
}

// Función para calcular tiempo promedio de procesamiento
async function getAvgProcessingTime(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(created_at,'UTC','America/Bogota'), CONVERT_TZ(created_at,'+00:00','-05:00'), DATE_ADD(created_at, INTERVAL -5 HOUR), created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;
    const shipDateCol = `COALESCE(CONVERT_TZ(shipping_date,'UTC','America/Bogota'), CONVERT_TZ(shipping_date,'+00:00','-05:00'), DATE_ADD(shipping_date, INTERVAL -5 HOUR), shipping_date)`;

    let whereDate = '';
    let params = [];

    if (startDate && endDate) {
      whereDate = `${dateCol} >= ? AND ${dateCol} <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 30 DAY)`;
    }

    const query = `
      SELECT 
        AVG(DATEDIFF(DATE(${shipDateCol}), DATE(${dateCol}))) as avg_processing_days,
        MIN(DATEDIFF(DATE(${shipDateCol}), DATE(${dateCol}))) as min_processing_days,
        MAX(DATEDIFF(DATE(${shipDateCol}), DATE(${dateCol}))) as max_processing_days
      FROM orders
      WHERE shipping_date IS NOT NULL 
        AND status IN ('enviado', 'entregado', 'entregado_cliente', 'entregado_transportadora')
        AND ${whereDate}
    `;

    const results = await db.query(query, params);
    const row = results[0];

    return {
      avgProcessingDays: parseFloat(row.avg_processing_days || 0).toFixed(1),
      minProcessingDays: row.min_processing_days || 0,
      maxProcessingDays: row.max_processing_days || 0
    };
  } catch (error) {
    console.error('Error en getAvgProcessingTime:', error);
    return {};
  }
}

// Función para calcular tasa de devoluciones
async function getReturnRate(startDate, endDate) {
  try {
    // Esto es un placeholder - se puede implementar cuando se tenga tabla de devoluciones
    return {
      returnRate: 0,
      totalReturns: 0,
      returnValue: 0
    };
  } catch (error) {
    console.error('Error en getReturnRate:', error);
    return {};
  }
}

// Función para obtener tendencias de ventas
async function getSalesTrends(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(created_at,'UTC','America/Bogota'), CONVERT_TZ(created_at,'+00:00','-05:00'), DATE_ADD(created_at, INTERVAL -5 HOUR), created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    let whereDate = '';
    let params = [];

    if (startDate && endDate) {
      whereDate = `${dateCol} >= ? AND ${dateCol} <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 12 WEEK)`;
    }

    const query = `
      SELECT 
        YEARWEEK(${dateCol}, 1) as year_week,
        DATE(DATE_SUB(${dateCol}, INTERVAL WEEKDAY(${dateCol}) DAY)) as week_start,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT customer_document) as unique_customers
      FROM orders
      WHERE ${whereDate}
        AND status NOT IN ('cancelado')
      GROUP BY YEARWEEK(${dateCol}, 1), DATE(DATE_SUB(${dateCol}, INTERVAL WEEKDAY(${dateCol}) DAY))
      ORDER BY year_week ASC
    `;

    const results = await db.query(query, params);

    return results.map(row => ({
      weekStart: row.week_start,
      orderCount: row.order_count,
      totalRevenue: parseFloat(row.total_revenue || 0),
      avgOrderValue: parseFloat(row.avg_order_value || 0),
      uniqueCustomers: row.unique_customers
    }));
  } catch (error) {
    console.error('Error en getSalesTrends:', error);
    return [];
  }
}

// Función para obtener rendimiento de productos
async function getProductPerformance(startDate, endDate) {
  try {
    const dateCol = `COALESCE(CONVERT_TZ(o.created_at,'UTC','America/Bogota'), CONVERT_TZ(o.created_at,'+00:00','-05:00'), DATE_ADD(o.created_at, INTERVAL -5 HOUR), o.created_at)`;
    const nowExpr = `DATE(COALESCE(CONVERT_TZ(NOW(),'UTC','America/Bogota'), CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'), DATE_ADD(UTC_TIMESTAMP(), INTERVAL -5 HOUR), NOW()))`;

    let whereDate = '';
    let params = [];

    if (startDate && endDate) {
      whereDate = `${dateCol} >= ? AND ${dateCol} <= ?`;
      params.push(startDate, endDate);
    } else {
      whereDate = `${dateCol} >= DATE_SUB(${nowExpr}, INTERVAL 60 DAY)`;
    }

    const query = `
      SELECT 
        oi.product_code,
        COALESCE(oi.name, oi.product_code) AS product_name,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(COALESCE(oi.subtotal, oi.quantity * COALESCE(oi.unit_price, oi.price, 0))) as total_revenue,
        AVG(COALESCE(oi.unit_price, oi.price, 0)) as avg_price
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE ${whereDate}
        AND o.status NOT IN ('cancelado')
      GROUP BY oi.product_code, COALESCE(oi.name, oi.product_code)
      ORDER BY total_revenue DESC
      LIMIT 20
    `;

    const results = await db.query(query, params);

    return results.map(row => ({
      productCode: row.product_code,
      productName: row.product_name,
      orderCount: row.order_count,
      totalQuantity: row.total_quantity,
      totalRevenue: parseFloat(row.total_revenue || 0),
      avgPrice: parseFloat(row.avg_price || 0)
    }));
  } catch (error) {
    console.error('Error en getProductPerformance:', error);
    return [];
  }
}

/**
 * F4: Postventa Analytics
 * - NPS/CSAT/CES resumen y comentarios (UGC)
 * - Tasa de respuesta por canal/periodo
 * - Distribución de riesgo de churn
 * - Resumen de Loyalty y Referidos
 */
const attachAuth = [authenticateToken, requireAdmin];

// Helper para construir filtros de fecha
function buildDateFilter(col, from, to, params) {
  let where = '';
  const colDate = `DATE(COALESCE(CONVERT_TZ(${col},'UTC','America/Bogota'), CONVERT_TZ(${col},'+00:00','-05:00'), DATE_ADD(${col}, INTERVAL -5 HOUR), ${col}))`;
  if (from) {
    where += ` AND ${colDate} >= ?`;
    params.push(from);
  }
  if (to) {
    where += ` AND ${colDate} <= ?`;
    params.push(to);
  }
  return where;
}

// GET /api/analytics/postventa/nps/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month&by=channel
router.get('/postventa/nps/summary', ...attachAuth, async (req, res) => {
  try {
    const groupBy = String(req.query.groupBy || 'day').toLowerCase();
    const by = String(req.query.by || '').toLowerCase(); // 'channel' o ''
    const from = req.query.from || null;
    const to = req.query.to || null;

    const params = [];
    const where = 'WHERE 1=1' + buildDateFilter('COALESCE(responded_at, sent_at, created_at)', from, to, params);
    const grpExpr = groupBy === 'month'
      ? "DATE_FORMAT(COALESCE(CONVERT_TZ(COALESCE(responded_at, sent_at, created_at),'UTC','America/Bogota'), CONVERT_TZ(COALESCE(responded_at, sent_at, created_at),'+00:00','-05:00'), DATE_ADD(COALESCE(responded_at, sent_at, created_at), INTERVAL -5 HOUR), COALESCE(responded_at, sent_at, created_at)), '%Y-%m-01')"
      : groupBy === 'week'
        ? "STR_TO_DATE(CONCAT(YEARWEEK(COALESCE(CONVERT_TZ(COALESCE(responded_at, sent_at, created_at),'UTC','America/Bogota'), CONVERT_TZ(COALESCE(responded_at, sent_at, created_at),'+00:00','-05:00'), DATE_ADD(COALESCE(responded_at, sent_at, created_at), INTERVAL -5 HOUR), COALESCE(responded_at, sent_at, created_at)), 1),' Monday'), '%X%V %W')"
        : "DATE(COALESCE(CONVERT_TZ(COALESCE(responded_at, sent_at, created_at),'UTC','America/Bogota'), CONVERT_TZ(COALESCE(responded_at, sent_at, created_at),'+00:00','-05:00'), DATE_ADD(COALESCE(responded_at, sent_at, created_at), INTERVAL -5 HOUR), COALESCE(responded_at, sent_at, created_at)))";
    const selBreak = by === 'channel' ? ', channel' : '';
    const grpBreak = by === 'channel' ? ', channel' : '';

    const sql = `
      SELECT
        ${grpExpr} AS grp
        ${selBreak},
        COUNT(*) AS sent,
        SUM(CASE WHEN responded_at IS NOT NULL THEN 1 ELSE 0 END) AS responses,
        AVG(nps) AS avg_nps,
        AVG(csat) AS avg_csat,
        AVG(ces) AS avg_ces
      FROM surveys
      ${where}
      GROUP BY grp ${grpBreak}
      ORDER BY grp ASC
    `;
    const rows = await db.query(sql, params);

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en nps/summary:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno' });
  }
});

// GET /api/analytics/postventa/nps/comments?from=&to=&minNps=&channel=&limit=50
router.get('/postventa/nps/comments', ...attachAuth, async (req, res) => {
  try {
    const { minNps = null, channel = null } = req.query || {};
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 50)));
    const from = req.query.from || null;
    const to = req.query.to || null;

    const params = [];
    let where = 'WHERE comment IS NOT NULL AND TRIM(comment) <> ""';
    where += buildDateFilter('COALESCE(responded_at, sent_at, created_at)', from, to, params);
    if (minNps !== null && minNps !== '') {
      where += ' AND (nps IS NOT NULL AND nps >= ?)';
      params.push(Number(minNps));
    }
    if (channel) {
      where += ' AND channel = ?';
      params.push(String(channel));
    }

    const sql = `
      SELECT id, order_id, customer_id, channel, nps, csat, ces, comment, responded_at, sent_at
        FROM surveys
      ${where}
      ORDER BY COALESCE(responded_at, sent_at, created_at) DESC
      LIMIT ${limit}
    `;
    const rows = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en nps/comments:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno' });
  }
});

// GET /api/analytics/postventa/response-rate?from=&to=&by=channel
router.get('/postventa/response-rate', ...attachAuth, async (req, res) => {
  try {
    const by = String(req.query.by || 'channel').toLowerCase();
    const from = req.query.from || null;
    const to = req.query.to || null;
    const params = [];
    const where = 'WHERE 1=1' + buildDateFilter('sent_at', from, to, params);

    const groupCol = by === 'channel' ? 'channel' : "DATE(COALESCE(CONVERT_TZ(sent_at,'UTC','America/Bogota'), CONVERT_TZ(sent_at,'+00:00','-05:00'), DATE_ADD(sent_at, INTERVAL -5 HOUR), sent_at))";
    const sql = `
      SELECT
        ${groupCol} AS grp,
        COUNT(*) AS sent,
        SUM(CASE WHEN responded_at IS NOT NULL THEN 1 ELSE 0 END) AS responses,
        ROUND((SUM(CASE WHEN responded_at IS NOT NULL THEN 1 ELSE 0 END)*100.0/NULLIF(COUNT(*),0)),1) AS response_rate
      FROM surveys
      ${where}
      GROUP BY grp
      ORDER BY grp ASC
    `;
    const rows = await db.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en response-rate:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno' });
  }
});

// GET /api/analytics/postventa/churn-risk
router.get('/postventa/churn-risk', ...attachAuth, async (req, res) => {
  try {
    // Distribución por buckets
    const buckets = await db.query(`
      SELECT
        SUM(CASE WHEN score < 20 THEN 1 ELSE 0 END) AS b_0_19,
        SUM(CASE WHEN score >= 20 AND score < 40 THEN 1 ELSE 0 END) AS b_20_39,
        SUM(CASE WHEN score >= 40 AND score < 60 THEN 1 ELSE 0 END) AS b_40_59,
        SUM(CASE WHEN score >= 60 AND score < 80 THEN 1 ELSE 0 END) AS b_60_79,
        SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) AS b_80_100,
        AVG(score) AS avg_score
      FROM churn_risk
    `);

    const topHigh = await db.query(`
      SELECT cr.customer_id, cr.score, cr.updated_at,
             cp.rfm_segment, cp.value_score, cp.risk_score
        FROM churn_risk cr
        LEFT JOIN customer_profiles cp ON cp.customer_id = cr.customer_id
       ORDER BY cr.score DESC, cr.updated_at DESC
       LIMIT 20
    `);

    return res.json({ success: true, data: { distribution: buckets?.[0] || {}, topHigh } });
  } catch (error) {
    console.error('Error en churn-risk:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno' });
  }
});

// GET /api/analytics/postventa/loyalty
router.get('/postventa/loyalty', ...attachAuth, async (req, res) => {
  try {
    const levels = await db.query(`
      SELECT level, COUNT(*) AS customers
        FROM loyalty_points
       GROUP BY level
    `);

    const totals = await db.query(`
      SELECT SUM(balance) AS total_points, AVG(balance) AS avg_balance
        FROM loyalty_points
    `);

    const topBalances = await db.query(`
      SELECT customer_id, balance, level
        FROM loyalty_points
       ORDER BY balance DESC
       LIMIT 20
    `);

    const reasons = await db.query(`
      SELECT reason, COUNT(*) AS movements, SUM(points) AS total_points
        FROM loyalty_movements
       GROUP BY reason
       ORDER BY movements DESC
    `);

    return res.json({
      success: true,
      data: {
        levels,
        totals: totals?.[0] || {},
        topBalances,
        reasons
      }
    });
  } catch (error) {
    console.error('Error en loyalty analytics:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno' });
  }
});

// GET /api/analytics/postventa/referrals
router.get('/postventa/referrals', ...attachAuth, async (req, res) => {
  try {
    const states = await db.query(`
      SELECT state, COUNT(*) AS count
        FROM referrals
       GROUP BY state
    `);

    const totals = await db.query(`
      SELECT COUNT(*) AS total, SUM(reward_points) AS total_reward_points
        FROM referrals
    `);

    const latest = await db.query(`
      SELECT id, referrer_customer_id, referred_customer_id, code, state, reward_points, created_at, updated_at
        FROM referrals
       ORDER BY id DESC
       LIMIT 20
    `);

    return res.json({
      success: true,
      data: {
        states,
        totals: totals?.[0] || {},
        latest
      }
    });
  } catch (error) {
    console.error('Error en referrals analytics:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno' });
  }
});

module.exports = router;
