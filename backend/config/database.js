// config/database.js - Підключення до PostgreSQL

const { Pool } = require('pg');

console.log('🔍 DB Config:');
console.log('  Host:', process.env.DB_HOST);
console.log('  User:', process.env.DB_USER);
console.log('  DB:', process.env.DB_NAME);
console.log('  Password:', process.env.DB_PASSWORD ? '***встановлено***' : '❌ ВІДСУТНІЙ');
console.log('  Type:', typeof process.env.DB_PASSWORD);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
  // ВАЖЛИВО: Додаємо UTF-8 encoding для PostgreSQL
  client_encoding: 'UTF8'
});

pool.on('connect', (client) => {
  // Встановлюємо UTF-8 для кожного з'єднання
  client.query('SET CLIENT_ENCODING TO UTF8');
  console.log('✅ База даних підключена (UTF-8)');
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