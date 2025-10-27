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
            units: 'metric'
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
   * Базова функція розрахунку AQI за EPA формулою
   */
  calculateAQI(concentration, breakpoints) {
    // Знаходимо відповідний діапазон
    let bp = breakpoints[0];
    for (const breakpoint of breakpoints) {
      if (concentration >= breakpoint.cLow && concentration <= breakpoint.cHigh) {
        bp = breakpoint;
        break;
      }
    }

    // Якщо значення вище максимального
    if (concentration > breakpoints[breakpoints.length - 1].cHigh) {
      return 500;
    }

    // EPA формула
    const aqi = Math.round(
      ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow
    );

    return aqi;
  }

  /**
   * Розрахунок AQI для PM2.5 (μg/m³)
   */
  calculateAQIFromPM25(pm25) {
    const breakpoints = [
      { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
      { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
      { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
      { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
      { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
      { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 }
    ];
    return this.calculateAQI(pm25, breakpoints);
  }

  /**
   * Розрахунок AQI для PM10 (μg/m³)
   */
  calculateAQIFromPM10(pm10) {
    const breakpoints = [
      { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
      { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
      { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
      { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
      { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
      { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 }
    ];
    return this.calculateAQI(pm10, breakpoints);
  }

  /**
   * Розрахунок AQI для NO2 (μg/m³)
   * Конвертація: ppb × 1.88 = μg/m³
   */
  calculateAQIFromNO2(no2) {
    // NO2 в μg/m³, конвертуємо в ppb
    const no2_ppb = no2 / 1.88;
    
    const breakpoints = [
      { cLow: 0, cHigh: 53, iLow: 0, iHigh: 50 },
      { cLow: 54, cHigh: 100, iLow: 51, iHigh: 100 },
      { cLow: 101, cHigh: 360, iLow: 101, iHigh: 150 },
      { cLow: 361, cHigh: 649, iLow: 151, iHigh: 200 },
      { cLow: 650, cHigh: 1249, iLow: 201, iHigh: 300 },
      { cLow: 1250, cHigh: 2049, iLow: 301, iHigh: 500 }
    ];
    return this.calculateAQI(no2_ppb, breakpoints);
  }

  /**
   * Розрахунок AQI для SO2 (μg/m³)
   * Конвертація: ppb × 2.62 = μg/m³
   */
  calculateAQIFromSO2(so2) {
    // SO2 в μg/m³, конвертуємо в ppb
    const so2_ppb = so2 / 2.62;
    
    const breakpoints = [
      { cLow: 0, cHigh: 35, iLow: 0, iHigh: 50 },
      { cLow: 36, cHigh: 75, iLow: 51, iHigh: 100 },
      { cLow: 76, cHigh: 185, iLow: 101, iHigh: 150 },
      { cLow: 186, cHigh: 304, iLow: 151, iHigh: 200 },
      { cLow: 305, cHigh: 604, iLow: 201, iHigh: 300 },
      { cLow: 605, cHigh: 1004, iLow: 301, iHigh: 500 }
    ];
    return this.calculateAQI(so2_ppb, breakpoints);
  }

  /**
   * Розрахунок AQI для CO (μg/m³)
   * Конвертація: ppm × 1145 = μg/m³
   */
  calculateAQIFromCO(co) {
    // CO в μg/m³, конвертуємо в ppm
    const co_ppm = co / 1145;
    
    const breakpoints = [
      { cLow: 0.0, cHigh: 4.4, iLow: 0, iHigh: 50 },
      { cLow: 4.5, cHigh: 9.4, iLow: 51, iHigh: 100 },
      { cLow: 9.5, cHigh: 12.4, iLow: 101, iHigh: 150 },
      { cLow: 12.5, cHigh: 15.4, iLow: 151, iHigh: 200 },
      { cLow: 15.5, cHigh: 30.4, iLow: 201, iHigh: 300 },
      { cLow: 30.5, cHigh: 50.4, iLow: 301, iHigh: 500 }
    ];
    return this.calculateAQI(co_ppm, breakpoints);
  }

  /**
   * Розрахунок AQI для O3 (μg/m³)
   * Конвертація: ppb × 2.00 = μg/m³
   */
  calculateAQIFromO3(o3) {
    // O3 в μg/m³, конвертуємо в ppb
    const o3_ppb = o3 / 2.00;
    
    const breakpoints = [
      { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
      { cLow: 55, cHigh: 70, iLow: 51, iHigh: 100 },
      { cLow: 71, cHigh: 85, iLow: 101, iHigh: 150 },
      { cLow: 86, cHigh: 105, iLow: 151, iHigh: 200 },
      { cLow: 106, cHigh: 200, iLow: 201, iHigh: 300 },
      { cLow: 201, cHigh: 604, iLow: 301, iHigh: 500 }
    ];
    return this.calculateAQI(o3_ppb, breakpoints);
  }

  /**
   * Розрахунок повного AQI з усіх параметрів
   */
  calculateFullAQI(pm25, pm10, no2, so2, co, o3) {
    const aqis = {
      pm25: pm25 > 0 ? this.calculateAQIFromPM25(pm25) : 0,
      pm10: pm10 > 0 ? this.calculateAQIFromPM10(pm10) : 0,
      no2: no2 > 0 ? this.calculateAQIFromNO2(no2) : 0,
      so2: so2 > 0 ? this.calculateAQIFromSO2(so2) : 0,
      co: co > 0 ? this.calculateAQIFromCO(co) : 0,
      o3: o3 > 0 ? this.calculateAQIFromO3(o3) : 0
    };

    // Знаходимо максимальний AQI
    const maxAQI = Math.max(...Object.values(aqis));
    
    // Знаходимо який параметр домінантний
    const dominant = Object.keys(aqis).find(key => aqis[key] === maxAQI);

    console.log(`🔢 AQI по параметрах:`, aqis);
    console.log(`👑 Домінантний: ${dominant.toUpperCase()} = ${maxAQI}`);

    return {
      aqi: maxAQI,
      dominant: dominant,
      breakdown: aqis
    };
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
      
      console.log(`📊 OpenWeather компоненти [${lat}, ${lon}]:`, components);
      
      // Розраховуємо AQI з УСІХ параметрів
      const aqiResult = this.calculateFullAQI(
        components.pm2_5 || 0,
        components.pm10 || 0,
        components.no2 || 0,
        components.so2 || 0,
        components.co || 0,
        components.o3 || 0
      );
      
      return {
        aqi: aqiResult.aqi,
        dominant_pollutant: aqiResult.dominant,
        aqi_breakdown: aqiResult.breakdown,
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
    const trafficFactor = (district.id === 2 || district.id === 3) ? 1.3 : 1.0;
    const greenFactor = (district.id === 5 || district.id === 6) ? 0.7 : 1.0;
    
    const basePM25 = 15 * trafficFactor * greenFactor;
    const basePM10 = 30 * trafficFactor * greenFactor;
    const baseNO2 = 40 * trafficFactor * greenFactor;
    
    const variance = () => 0.8 + Math.random() * 0.4;
    
    const pm25 = Math.round(basePM25 * variance() * 10) / 10;
    const pm10 = Math.round(basePM10 * variance() * 10) / 10;
    const no2 = Math.round(baseNO2 * variance() * 10) / 10;
    const so2 = Math.round(8 * variance() * 10) / 10;
    const co = Math.round(300 * variance());
    const o3 = Math.round(50 * variance() * 10) / 10;
    
    const aqiResult = this.calculateFullAQI(pm25, pm10, no2, so2, co, o3);
    
    const now = new Date();
    const month = now.getMonth();
    let baseTemp;
    
    if (month >= 11 || month <= 1) {
      baseTemp = -2 + Math.random() * 8;
    } else if (month >= 2 && month <= 4) {
      baseTemp = 5 + Math.random() * 15;
    } else if (month >= 5 && month <= 8) {
      baseTemp = 15 + Math.random() * 15;
    } else {
      baseTemp = 5 + Math.random() * 10;
    }
    
    return {
      aqi: aqiResult.aqi,
      dominant_pollutant: aqiResult.dominant,
      aqi_breakdown: aqiResult.breakdown,
      pm25: pm25,
      pm10: pm10,
      no2: no2,
      so2: so2,
      co: co,
      o3: o3,
      temperature: parseFloat(baseTemp.toFixed(1)),
      humidity: 50 + Math.round(Math.random() * 40),
      timestamp: new Date(),
      source: 'mock'
    };
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
      
      try {
        airQualityData = await this.getOpenWeatherAirQuality(district.latitude, district.longitude);
        console.log(`✅ OpenWeather AQ успішно для ${district.name}`);
        
        weatherData = await this.getWeatherData(district.latitude, district.longitude);
        if (weatherData) {
          console.log(`🌡️ Температура для ${district.name}: ${weatherData.temperature}°C`);
        }
      } catch (owError) {
        console.log(`⚠️ OpenWeather не вдалося для ${district.name}: ${owError.message}`);
        airQualityData = this.generateMockData(district);
        console.log(`🔧 Використано mock дані для ${district.name}`);
      }

      const combinedData = {
        districtId: district.id,
        districtName: district.name,
        ...airQualityData,
        temperature: weatherData ? parseFloat(weatherData.temperature.toFixed(1)) : airQualityData.temperature,
        humidity: weatherData ? weatherData.humidity : airQualityData.humidity,
        pressure: weatherData ? weatherData.pressure : null,
        wind_speed: weatherData ? weatherData.wind_speed : null
      };

      console.log(`✅ Фінальні дані для ${district.name}:`, {
        aqi: combinedData.aqi,
        dominant: combinedData.dominant_pollutant,
        pm25: combinedData.pm25,
        temperature: combinedData.temperature,
        source: combinedData.source
      });

      return combinedData;

    } catch (error) {
      console.error(`❌ Критична помилка для району ${district.name}:`, error.message);
      
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