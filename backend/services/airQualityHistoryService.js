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

  async saveCurrentDataToHistory() {
    try {
      console.log('💾 Збереження даних в історію...');
      const data = await airQualityService.getAllDistrictsAirQuality();
      
      for (const districtData of data) {
        await query(
          `INSERT INTO air_quality_history 
           (district_id, aqi, aqi_status, pm25, pm10, no2, so2, co, o3, measured_at, data_source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
            districtData.source || 'openweather'
          ]
        );
      }
      
      console.log(`✅ Збережено дані для ${data.length} районів`);
      return { success: true, count: data.length };
    } catch (error) {
      console.error('❌ Помилка збереження в історію:', error);
      throw error;
    }
  }

  async getDistrictHistory(districtId, period = '24h') {
    try {
      const intervals = {
        '1h': '1 hour',
        '24h': '24 hours',
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
        ORDER BY measured_at ASC`,
        [districtId]
      );

      return result.rows;
    } catch (error) {
      console.error('Помилка отримання історії:', error);
      throw error;
    }
  }

  async getDistrictStats(districtId, period = '24h') {
    try {
      const intervals = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = intervals[period] || '24 hours';

      const result = await query(
        `SELECT 
          AVG(aqi)::numeric(10,2) as avg_aqi,
          MAX(aqi) as max_aqi,
          MIN(aqi) as min_aqi,
          AVG(pm25)::numeric(10,2) as avg_pm25,
          MAX(pm25)::numeric(10,2) as max_pm25,
          MIN(pm25)::numeric(10,2) as min_pm25,
          AVG(pm10)::numeric(10,2) as avg_pm10,
          MAX(pm10)::numeric(10,2) as max_pm10,
          MIN(pm10)::numeric(10,2) as min_pm10,
          COUNT(*) as measurements_count
        FROM air_quality_history
        WHERE district_id = $1 
          AND measured_at >= NOW() - INTERVAL '${interval}'`,
        [districtId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Помилка отримання статистики:', error);
      throw error;
    }
  }

  async cleanOldData() {
    try {
      const result = await query(
        `DELETE FROM air_quality_history 
         WHERE measured_at < NOW() - INTERVAL '90 days'`
      );
      
      console.log(`🗑️ Видалено ${result.rowCount} старих записів`);
      return { deleted: result.rowCount };
    } catch (error) {
      console.error('Помилка очищення старих даних:', error);
      throw error;
    }
  }
}

module.exports = new AirQualityHistoryService();