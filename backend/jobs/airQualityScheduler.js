// backend/jobs/airQualityScheduler.js
const cron = require('node-cron');
const airQualityHistoryService = require('../services/airQualityHistoryService');

class AirQualityScheduler {
  start() {
    // Збирати дані кожні 15 хвилин
    cron.schedule('*/15 * * * *', async () => {
      console.log('⏰ Запуск збору даних (кожні 15 хвилин)...');
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
    console.log('   - Збір даних: кожні 15 хвилин');
    console.log('   - Очищення: щодня о 3:00');
  }
}

module.exports = new AirQualityScheduler();