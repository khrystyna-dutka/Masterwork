// backend/services/airQualityService.js
const axios = require('axios');
const config = require('../config/config');

class AirQualityService {
  constructor() {
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.openWeatherBaseUrl = 'http://api.openweathermap.org/data/2.5';
  }

  /**
   * Отримати дані про погоду (температуру, вологість) з OpenWeatherMap
   */
  async getWeatherData(lat, lon) {
    try {
      if (!this.openWeatherApiKey) {
        console.warn('⚠️ OpenWeather API ключ не налаштований');
        return null;
      }

      const response = await axios.get(
        `${this.openWeatherBaseUrl}/weather`,
        {
          params: {
            lat: lat,
            lon: lon,
            appid: this.openWeatherApiKey,
            units: 'metric' // Цельсій
          },
          timeout: 5000
        }
      );

      const data = response.data;
      
      return {
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        wind_speed: data.wind.speed,
        wind_direction: data.wind.deg,
        weather: data.weather[0].description
      };
    } catch (error) {
      console.error('OpenWeather Weather API Error:', error.message);
      return null;
    }
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
        source: 'openweather'
      };
    } catch (error) {
      console.error('OpenWeather API Error:', error.message);
      throw error;
    }
  }

  /**
   * Генерувати реалістичні тестові дані на основі району
   */
  generateMockData(district) {
    // Базові значення залежать від характеристик району
    const trafficFactor = (district.id === 2 || district.id === 3) ? 1.3 : 1.0; // Залізничний та Франківський
    const greenFactor = (district.id === 5 || district.id === 6) ? 0.7 : 1.0;   // Личаківський та Сихівський
    
    const basePM25 = 15 * trafficFactor * greenFactor;
    const basePM10 = 30 * trafficFactor * greenFactor;
    const baseNO2 = 40 * trafficFactor * greenFactor;
    
    // Додаємо випадкову варіацію ±20%
    const variance = () => 0.8 + Math.random() * 0.4;
    
    const pm25 = Math.round(basePM25 * variance() * 10) / 10;
    const pm10 = Math.round(basePM10 * variance() * 10) / 10;
    const no2 = Math.round(baseNO2 * variance() * 10) / 10;
    
    const aqi = this.calculateAQIFromPM25(pm25);
    
    // Реалістична температура для поточного сезону
    const now = new Date();
    const month = now.getMonth(); // 0-11
    let baseTemp;
    
    if (month >= 11 || month <= 1) { // Грудень, Січень, Лютий - зима
      baseTemp = -2 + Math.random() * 8; // від -2 до +6
    } else if (month >= 2 && month <= 4) { // Березень, Квітень, Травень - весна
      baseTemp = 5 + Math.random() * 15; // від +5 до +20
    } else if (month >= 5 && month <= 8) { // Червень, Липень, Серпень, Вересень - літо
      baseTemp = 15 + Math.random() * 15; // від +15 до +30
    } else { // Жовтень, Листопад - осінь
      baseTemp = 5 + Math.random() * 10; // від +5 до +15
    }
    
    return {
      aqi: aqi,
      pm25: pm25,
      pm10: pm10,
      no2: no2,
      so2: Math.round(8 * variance() * 10) / 10,
      co: Math.round(300 * variance()),
      o3: Math.round(50 * variance() * 10) / 10,
      temperature: parseFloat(baseTemp.toFixed(1)),
      humidity: 50 + Math.round(Math.random() * 40), // 50-90%
      timestamp: new Date(),
      source: 'mock'
    };
  }

  /**
   * Розрахунок AQI з PM2.5
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
   * Отримати комбіновані дані для конкретного району
   */
  async getDistrictAirQuality(district) {
    console.log(`\n📍 Отримання даних для району: ${district.name} [${district.latitude}, ${district.longitude}]`);
    
    try {
      let airQualityData;
      let weatherData = null;
      
      // Спробуємо OpenWeather Air Quality
      try {
        airQualityData = await this.getOpenWeatherAirQuality(district.latitude, district.longitude);
        console.log(`✅ OpenWeather AQ успішно для ${district.name}`);
        
        // ДОДАТКОВО отримуємо погоду (температуру)
        weatherData = await this.getWeatherData(district.latitude, district.longitude);
        if (weatherData) {
          console.log(`🌡️ Температура для ${district.name}: ${weatherData.temperature}°C`);
        }
      } catch (owError) {
        console.log(`⚠️ OpenWeather не вдалося для ${district.name}: ${owError.message}`);
        // Використовуємо mock дані
        airQualityData = this.generateMockData(district);
        console.log(`🔧 Використано mock дані для ${district.name}`);
      }

      // Комбінуємо дані про якість повітря та погоду
      const combinedData = {
        districtId: district.id,
        districtName: district.name,
        ...airQualityData,
        // Додаємо дані про погоду якщо є
        temperature: weatherData ? parseFloat(weatherData.temperature.toFixed(1)) : airQualityData.temperature,
        humidity: weatherData ? weatherData.humidity : airQualityData.humidity,
        pressure: weatherData ? weatherData.pressure : null,
        wind_speed: weatherData ? weatherData.wind_speed : null
      };

      console.log(`✅ Фінальні дані для ${district.name}:`, {
        aqi: combinedData.aqi,
        temperature: combinedData.temperature,
        source: combinedData.source
      });

      return combinedData;

    } catch (error) {
      console.error(`❌ Критична помилка для району ${district.name}:`, error.message);
      
      // Fallback на mock дані
      const mockData = this.generateMockData(district);
      return {
        districtId: district.id,
        districtName: district.name,
        ...mockData
      };
    }
  }

  /**
   * Отримати дані для всіх районів Львова
   */
  async getAllDistrictsAirQuality() {
    const districts = config.districts;
    
    console.log('\n=== 🚀 Початок отримання даних для всіх районів ===\n');
    
    const results = await Promise.allSettled(
      districts.map(district => this.getDistrictAirQuality(district))
    );

    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    console.log(`\n=== ✅ Завершено: ${successfulResults.length}/${districts.length} районів ===\n`);
    
    return successfulResults;
  }
}

module.exports = new AirQualityService();