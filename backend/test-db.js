require('dotenv').config();
const { query } = require('./config/database');

async function test() {
  try {
    const result = await query('SELECT * FROM districts');
    console.log('✅ Працює! Знайдено районів:', result.rows.length);
    result.rows.forEach(d => {
      console.log(`  - ${d.name}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('❌ Помилка:', err.message);
    process.exit(1);
  }
}

test();