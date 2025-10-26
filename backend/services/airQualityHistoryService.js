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
      
      let savedCount = 0;
      
      for (const districtData of data) {
        console.log(`📊 Зберігаємо дані для району ${districtData.districtName} (ID: ${districtData.districtId}):`, {
          aqi: districtData.aqi,
          pm25: districtData.pm25,
          temperature: districtData.temperature,
          humidity: districtData.humidity,
          source: districtData.source
        });

        await query(
          `INSERT INTO air_quality_history 
           (district_id, aqi, aqi_status, pm25, pm10, no2, so2, co, o3, 
            temperature, humidity, pressure, wind_speed, measured_at, data_source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
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
            districtData.temperature || null,
            districtData.humidity || null,
            districtData.pressure || null,
            districtData.wind_speed || null,
            districtData.timestamp || new Date(),
            districtData.source || 'openweather'
          ]
        );
        
        savedCount++;
      }
      
      console.log(`✅ Збережено ${savedCount} нових записів для ${data.length} районів`);
      return { success: true, count: data.length, savedRecords: savedCount };
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
          temperature,
          humidity,
          pressure,
          wind_speed,
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
          AVG(temperature)::numeric(5,2) as avg_temperature,
          MAX(temperature)::numeric(5,2) as max_temperature,
          MIN(temperature)::numeric(5,2) as min_temperature,
          AVG(humidity)::numeric(5,2) as avg_humidity,
          MAX(humidity) as max_humidity,
          MIN(humidity) as min_humidity,
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
      console.log('🗑️ Очищення старих даних...');
      
      // Видаляємо дані старіші за 90 днів
      const result = await query(
        `DELETE FROM air_quality_history 
         WHERE measured_at < NOW() - INTERVAL '90 days'`
      );
      
      console.log(`✅ Видалено ${result.rowCount} старих записів (>90 днів)`);
      return { deleted: result.rowCount };
    } catch (error) {
      console.error('❌ Помилка очищення старих даних:', error);
      throw error;
    }
  }

  async getLatestData(districtId) {
    try {
      const result = await query(
        `SELECT 
          aqh.aqi,
          aqh.pm25,
          aqh.pm10,
          aqh.no2,
          aqh.so2,
          aqh.co,
          aqh.o3,
          aqh.temperature,
          aqh.humidity,
          aqh.pressure,
          aqh.wind_speed,
          aqh.measured_at,
          aqh.data_source as source,
          d.name as district_name
        FROM air_quality_history aqh
        JOIN districts d ON aqh.district_id = d.id
        WHERE aqh.district_id = $1
        ORDER BY aqh.measured_at DESC
        LIMIT 1`,
        [districtId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Помилка отримання останніх даних:', error);
      throw error;
    }
  }
}

module.exports = new AirQualityHistoryService();