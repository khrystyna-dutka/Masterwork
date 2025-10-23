// backend/services/airQualityService.js
const axios = require('axios');
const config = require('../config/config');

class AirQualityService {
  constructor() {
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.saveEcoBotBaseUrl = 'https://api.saveecobot.com';
    this.openWeatherBaseUrl = 'http://api.openweathermap.org/data/2.5';
    this.waqiBaseUrl = 'https://api.waqi.info';
  }

  /**
   * Отримати дані про якість повітря з OpenWeatherMap
   */
  async getOpenWeatherAirQuality(lat, lon) {
    try {
      if (!this.openWeatherApiKey) {
        throw new Error('OpenWeather API ключ не налаштований');
      }

      const response = await axios.get(
        `${this.openWeatherBaseUrl}/air_pollution`,
        {
          params: {
            lat: lat,
            lon: lon,
            appid: this.openWeatherApiKey
          },
          timeout: 5000
        }
      );

      const data = response.data.list[0];
      const components = data.components;
      
      console.log(`OpenWeather дані для [${lat}, ${lon}]:`, components);
      
      // OpenWeather повертає AQI від 1 до 5
      // Конвертуємо до шкали 0-500
      const aqiConversion = {
        1: 25,   // Good
        2: 75,   // Fair
        3: 125,  // Moderate
        4: 175,  // Poor
        5: 275   // Very Poor
      };
      
      const aqi = aqiConversion[data.main.aqi] || 50;
      
      return {
        aqi: aqi,
        pm25: components.pm2_5 || 0,
        pm10: components.pm10 || 0,
        no2: components.no2 || 0,
        so2: components.so2 || 0,
        co: components.co || 0,
        o3: components.o3 || 0,
        timestamp: new Date(data.dt * 1000),
        source: 'openweather',
        raw: components // для дебагу
      };
    } catch (error) {
      console.error('OpenWeather API Error:', error.message);
      throw error;
    }
  }

  /**
   * Отримати дані з WAQI (World Air Quality Index) як альтернатива
   */
  async getWAQIData(lat, lon) {
    try {
      // WAQI має публічний endpoint без ключа для деяких міст
      const response = await axios.get(
        `${this.waqiBaseUrl}/feed/geo:${lat};${lon}/`,
        {
          params: {
            token: process.env.WAQI_TOKEN || 'demo' // demo token для тестування
          },
          timeout: 5000
        }
      );

      if (response.data.status !== 'ok') {
        throw new Error('WAQI повернув помилку');
      }

      const data = response.data.data;
      const iaqi = data.iaqi || {};
      
      console.log('WAQI дані:', data);
      
      return {
        aqi: data.aqi || 0,
        pm25: iaqi.pm25?.v || 0,
        pm10: iaqi.pm10?.v || 0,
        no2: iaqi.no2?.v || 0,
        so2: iaqi.so2?.v || 0,
        co: iaqi.co?.v || 0,
        o3: iaqi.o3?.v || 0,
        timestamp: new Date(data.time.v * 1000),
        source: 'waqi',
        city: data.city?.name
      };
    } catch (error) {
      console.error('WAQI API Error:', error.message);
      return null;
    }
  }

  /**
   * Генерувати реалістичні тестові дані на основі району
   */
  generateMockData(district) {
    // Базові значення залежать від характеристик району
    const trafficFactor = (district.id === 2 || district.id === 5) ? 1.3 : 1.0; // Залізничний та Франківський
    const greenFactor = (district.id === 3 || district.id === 4) ? 0.7 : 1.0;   // Личаківський та Сихівський
    
    const basePM25 = 15 * trafficFactor * greenFactor;
    const basePM10 = 30 * trafficFactor * greenFactor;
    const baseNO2 = 40 * trafficFactor * greenFactor;
    
    // Додаємо випадкову варіацію ±20%
    const variance = () => 0.8 + Math.random() * 0.4;
    
    const pm25 = Math.round(basePM25 * variance() * 10) / 10;
    const pm10 = Math.round(basePM10 * variance() * 10) / 10;
    const no2 = Math.round(baseNO2 * variance() * 10) / 10;
    
    const aqi = this.calculateAQIFromPM25(pm25);
    
    return {
      aqi: aqi,
      pm25: pm25,
      pm10: pm10,
      no2: no2,
      so2: Math.round(8 * variance() * 10) / 10,
      co: Math.round(300 * variance()),
      o3: Math.round(50 * variance() * 10) / 10,
      timestamp: new Date(),
      source: 'mock'
    };
  }

  /**
   * Отримати комбіновані дані для конкретного району
   */
  async getDistrictAirQuality(district) {
    console.log(`\nОтримання даних для району: ${district.name} [${district.lat}, ${district.lng}]`);
    
    try {
      // Спробуємо OpenWeather
      let airQualityData;
      
      try {
        airQualityData = await this.getOpenWeatherAirQuality(district.lat, district.lng);
        console.log(`✓ OpenWeather успішно для ${district.name}`);
      } catch (owError) {
        console.log(`✗ OpenWeather не вдалося для ${district.name}: ${owError.message}`);
        
        // Спробуємо WAQI
        try {
          airQualityData = await this.getWAQIData(district.lat, district.lng);
          if (airQualityData) {
            console.log(`✓ WAQI успішно для ${district.name}`);
          } else {
            throw new Error('WAQI повернув null');
          }
        } catch (waqiError) {
          console.log(`✗ WAQI не вдалося для ${district.name}: ${waqiError.message}`);
          // Використовуємо mock дані
          console.log(`→ Використовуємо mock дані для ${district.name}`);
          airQualityData = this.generateMockData(district);
        }
      }

      // Додаємо інформацію про район
      return {
        districtId: district.id,
        districtName: district.name,
        ...airQualityData,
        location: {
          lat: district.lat,
          lng: district.lng
        }
      };
    } catch (error) {
      console.error(`Критична помилка для ${district.name}:`, error.message);
      // В крайньому випадку - mock дані
      const mockData = this.generateMockData(district);
      return {
        districtId: district.id,
        districtName: district.name,
        ...mockData,
        location: {
          lat: district.lat,
          lng: district.lng
        }
      };
    }
  }

  /**
   * Розрахувати AQI на основі PM2.5 (спрощений метод EPA)
   */
  calculateAQIFromPM25(pm25) {
    if (pm25 <= 12.0) {
      return Math.round((50 / 12.0) * pm25);
    } else if (pm25 <= 35.4) {
      return Math.round(50 + ((100 - 50) / (35.4 - 12.0)) * (pm25 - 12.0));
    } else if (pm25 <= 55.4) {
      return Math.round(100 + ((150 - 100) / (55.4 - 35.4)) * (pm25 - 35.4));
    } else if (pm25 <= 150.4) {
      return Math.round(150 + ((200 - 150) / (150.4 - 55.4)) * (pm25 - 55.4));
    } else if (pm25 <= 250.4) {
      return Math.round(200 + ((300 - 200) / (250.4 - 150.4)) * (pm25 - 150.4));
    } else {
      return Math.round(300 + ((500 - 300) / (500.4 - 250.4)) * (pm25 - 250.4));
    }
  }

  /**
   * Отримати статус якості повітря за AQI
   */
  getAQIStatus(aqi) {
    if (aqi <= 50) return { level: 'good', label: 'Добра', color: '#10b981' };
    if (aqi <= 100) return { level: 'moderate', label: 'Помірна', color: '#f59e0b' };
    if (aqi <= 150) return { level: 'unhealthy_sensitive', label: 'Нездорова для чутливих', color: '#f97316' };
    if (aqi <= 200) return { level: 'unhealthy', label: 'Нездорова', color: '#ef4444' };
    if (aqi <= 300) return { level: 'very_unhealthy', label: 'Дуже нездорова', color: '#9333ea' };
    return { level: 'hazardous', label: 'Небезпечна', color: '#7f1d1d' };
  }

  /**
   * Отримати дані для всіх районів Львова
   */
  async getAllDistrictsAirQuality() {
    const districts = config.districts;
    
    console.log('\n=== Початок отримання даних для всіх районів ===\n');
    
    const results = await Promise.allSettled(
      districts.map(district => this.getDistrictAirQuality(district))
    );

    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    console.log(`\n=== Завершено: ${successfulResults.length}/${districts.length} районів ===\n`);
    
    return successfulResults;
  }
}

module.exports = new AirQualityService();