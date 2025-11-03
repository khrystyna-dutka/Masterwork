// backend/services/airQualityHistoryService.js
const { query } = require('../config/database');
const airQualityService = require('./airQualityService');

class AirQualityHistoryService {
  
  getAQIStatusLabel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  /**
   * Зберегти поточні реальні дані в історію
   */
  async saveCurrentDataToHistory() {
    try {
      console.log('💾 Збереження даних в історію...');
      const data = await airQualityService.getAllDistrictsAirQuality();
      
      for (const districtData of data) {
        await query(
          `INSERT INTO air_quality_history 
           (district_id, aqi, aqi_status, pm25, pm10, no2, so2, co, o3, measured_at, data_source, is_forecast)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            districtData.districtId,
            districtData.aqi,
            this.getAQIStatusLabel(districtData.aqi),
            districtData.pm25,
            districtData.pm10,
            districtData.no2 || 0,
            districtData.so2 || 0,
            districtData.co || 0,
            districtData.o3 || 0,
            districtData.timestamp || new Date(),
            districtData.source || 'openweather',
            false  // ← is_forecast = false для реальних даних
          ]
        );
      }
      
      console.log(`✅ Збережено дані для ${data.length} районів`);
      return { success: true, count: data.length };
      await this.triggerMLCheck();

    } catch (error) {
      console.error('❌ Помилка збереження в історію:', error);
      throw error;
    }
  }

  async triggerMLCheck() {
  try {
    console.log('🤖 Запуск ML перевірки...');
    
    const response = await axios.post('http://localhost:5001/api/monitor/all', {
      timeout: 30000
    });
    
    if (response.data.success) {
      const retrainedCount = response.data.results.filter(r => r.retrained).length;
      
      if (retrainedCount > 0) {
        console.log(`🔄 Перенавчано ${retrainedCount} моделей`);
      } else {
        console.log('✅ Всі моделі працюють нормально');
      }
    }
    
  } catch (error) {
    console.error('⚠️ ML перевірка недоступна:', error.message);
  }
}

  /**
   * Отримати історію для району (БЕЗ прогнозів!)
   */
  async getDistrictHistory(districtId, period = '24h') {
    try {
      const intervals = {
        '1h': '1 hour',
        '12h': '12 hours',
        '24h': '24 hours',
        '48h': '48 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[period] || '24 hours';

      const result = await query(
        `SELECT 
          id,
          aqi,
          aqi_status,
          pm25,
          pm10,
          no2,
          so2,
          co,
          o3,
          measured_at,
          data_source as source
        FROM air_quality_history
        WHERE district_id = $1 
          AND measured_at >= NOW() - INTERVAL '${interval}'
          AND is_forecast = false
        ORDER BY measured_at ASC`,
        [districtId]
      );

      console.log(`📊 Отримано ${result.rows.length} записів історії для району ${districtId} (період: ${period})`);
      return result.rows;
    } catch (error) {
      console.error('Помилка отримання історії:', error);
      throw error;
    }
  }

  /**
   * Отримати статистику по району
   */
  async getDistrictStats(districtId, period = '24h') {
    try {
      const intervals = {
        '1h': '1 hour',
        '12h': '12 hours',
        '24h': '24 hours',
        '48h': '48 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[period] || '24 hours';

      const result = await query(
        `SELECT 
          AVG(aqi) as avg_aqi,
          MIN(aqi) as min_aqi,
          MAX(aqi) as max_aqi,
          AVG(pm25) as avg_pm25,
          MIN(pm25) as min_pm25,
          MAX(pm25) as max_pm25,
          AVG(pm10) as avg_pm10,
          MIN(pm10) as min_pm10,
          MAX(pm10) as max_pm10,
          COUNT(*) as total_records
        FROM air_quality_history
        WHERE district_id = $1 
          AND measured_at >= NOW() - INTERVAL '${interval}'
          AND is_forecast = false
        `,
        [districtId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Помилка отримання статистики:', error);
      throw error;
    }
  }

  /**
   * Очистити старі записи (старші ніж X днів)
   */
  async cleanOldRecords(daysToKeep = 30) {
    try {
      console.log(`🧹 Очищення записів старіших ${daysToKeep} днів...`);
      
      const result = await query(
        `DELETE FROM air_quality_history 
         WHERE measured_at < NOW() - INTERVAL '${daysToKeep} days'
         RETURNING id`,
        []
      );

      console.log(`✅ Видалено ${result.rows.length} старих записів`);
      return { success: true, deleted: result.rows.length };
    } catch (error) {
      console.error('❌ Помилка очищення старих записів:', error);
      throw error;
    }
  }

  /**
   * Отримати прогнози для району (тільки is_forecast = true)
   */
  async getDistrictForecasts(districtId, hours = 24) {
    try {
      const result = await query(
        `SELECT 
          id,
          aqi,
          aqi_status,
          pm25,
          pm10,
          no2,
          so2,
          co,
          o3,
          measured_at,
          confidence_level
        FROM air_quality_history
        WHERE district_id = $1 
          AND is_forecast = true
          AND measured_at >= NOW()
          AND measured_at <= NOW() + INTERVAL '${hours} hours'
        ORDER BY measured_at ASC`,
        [districtId]
      );

      console.log(`🔮 Отримано ${result.rows.length} прогнозів для району ${districtId}`);
      return result.rows;
    } catch (error) {
      console.error('Помилка отримання прогнозів:', error);
      throw error;
    }
  }

  /**
   * Видалити старі прогнози (які вже в минулому)
   */
  async cleanOldForecasts() {
    try {
      console.log('🧹 Очищення старих прогнозів...');
      
      const result = await query(
        `DELETE FROM air_quality_history 
         WHERE is_forecast = true 
           AND measured_at < NOW()
         RETURNING id`,
        []
      );

      console.log(`✅ Видалено ${result.rows.length} старих прогнозів`);
      return { success: true, deleted: result.rows.length };
    } catch (error) {
      console.error('❌ Помилка очищення прогнозів:', error);
      throw error;
    }
  }
}

module.exports = new AirQualityHistoryService();