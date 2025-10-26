// backend/test-history.js
require('dotenv').config();
const airQualityHistoryService = require('./services/airQualityHistoryService');

async function test() {
  try {
    console.log('🧪 Тестування збереження даних в історію...');
    
    const result = await airQualityHistoryService.saveCurrentDataToHistory();
    console.log('✅ Результат:', result);
    
    console.log('\n📊 Перевірка збережених даних...');
    const history = await airQualityHistoryService.getDistrictHistory(1, '24h');
    console.log(`✅ Знайдено ${history.length} записів для району 1`);
    
    if (history.length > 0) {
      console.log('Останній запис:', history[history.length - 1]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

test();