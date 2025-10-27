// backend/scripts/cleanOldForecasts.js
const path = require('path');

// Завантажуємо .env з ПРАВИЛЬНОГО шляху
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Дебаг - перевіримо чи завантажилось
console.log('🔍 Перевірка .env:');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***є***' : '❌ немає');
console.log('DB_HOST:', process.env.DB_HOST);

const historyService = require('../services/airQualityHistoryService');

async function cleanOldForecasts() {
  console.log('🧹 Запуск очищення старих прогнозів...');
  
  try {
    const result = await historyService.cleanOldForecasts();
    console.log(`✅ Очищення завершено. Видалено ${result.deleted} записів`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

cleanOldForecasts();