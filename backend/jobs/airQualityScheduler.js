// backend/jobs/airQualityScheduler.js
const cron = require('node-cron');
const airQualityHistoryService = require('../services/airQualityHistoryService');

class AirQualityScheduler {
  start() {
    // Збирати дані кожну годину (0 хвилин кожної години)
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Запуск збору даних (кожну годину)...');
      try {
        await airQualityHistoryService.saveCurrentDataToHistory();
      } catch (error) {
        console.error('Помилка в scheduler:', error);
      }
    });

    // Очищати старі дані кожен день о 3:00
    cron.schedule('0 3 * * *', async () => {
      console.log('🗑️ Запуск очищення старих даних...');
      try {
        await airQualityHistoryService.cleanOldData();
      } catch (error) {
        console.error('Помилка очищення:', error);
      }
    });

    console.log('✅ Scheduler запущено:');
    console.log('   - Збір даних: кожну годину');
    console.log('   - Очищення: щодня о 3:00');
  }
}

module.exports = new AirQualityScheduler();