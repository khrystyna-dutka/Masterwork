// check_data.js
require('dotenv').config(); // ⬅️ ДОДАЛИ!
const { pool } = require('./config/database');

pool.query(`
  SELECT 
    data_source, 
    COUNT(*) as count,
    MIN(measured_at) as first,
    MAX(measured_at) as last
  FROM air_quality_history 
  WHERE district_id = 1 AND is_forecast = false
  GROUP BY data_source
  ORDER BY count DESC
`)
.then(r => {
  console.log('\n📊 ДЖЕРЕЛА ДАНИХ ДЛЯ РАЙОНУ ГАЛИЦЬКИЙ:\n');
  console.table(r.rows);
  pool.end();
})
.catch(err => {
  console.error('Помилка:', err);
  pool.end();
});