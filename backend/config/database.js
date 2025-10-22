// config/database.js - Підключення до PostgreSQL

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
});

pool.on('connect', () => {
  console.log('✅ База даних підключена');
});

pool.on('error', (err) => {
  console.error('❌ Помилка БД:', err);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`Запит виконано за ${duration}ms`);
    return res;
  } catch (error) {
    console.error('Помилка запиту:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query
};