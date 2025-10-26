// backend/scripts/cleanSubscriptions.js
require('dotenv').config();
const { query, pool } = require('../config/database');

async function cleanSubscriptions() {
  try {
    console.log('🔄 Очищення старих підписок...');

    const result = await query('DELETE FROM user_subscriptions');
    console.log(`✅ Видалено ${result.rowCount} старих підписок`);

    console.log('ℹ️  Користувачі можуть створити нові підписки через профіль');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanSubscriptions();