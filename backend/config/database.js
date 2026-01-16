const mysql = require('mysql2/promise');
console.log('🚀 DATABASE.JS LOADED - VERSION: POOL_QUERY_DEBUG');
const path = require('path');
// Cargar variables de entorno desde backend/.env por defecto
const dotenvPath = process.env.BACKEND_ENV_PATH || path.resolve(__dirname, '../.env');
require('dotenv').config({ path: dotenvPath });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_pedidos_dev',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  // mysql2 valid option for initial connection timeout
  connectTimeout: 60000
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Set flexible SQL mode for every new connection to avoid ONLY_FULL_GROUP_BY errors
pool.on('connection', (connection) => {
  try {
    connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
  } catch (e) {
    console.error('⚠️ Error setting SQL mode on connection:', e.message);
  }
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida correctamente');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
};

// Función para ejecutar queries
const query = async (sql, params = []) => {
  try {
    // SHOW/DESCRIBE/EXPLAIN no funcionan bien con prepared statements en MariaDB.
    // Usar pool.query (no preparado) para estas sentencias.
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    console.error('❌ Error ejecutando query SQL:', sql);
    console.error('📊 Número de parámetros:', params ? params.length : 0);
    console.error('📝 Error details:', error);
    throw error;
  }
};

// Función para transacciones
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const poolEnd = async () => {
  try {
    await pool.end();
    console.log('✅ Pool de conexiones MySQL cerrado correctamente');
  } catch (err) {
    console.warn('⚠️ Error cerrando pool MySQL (ignorado):', err.message);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  poolEnd
};
