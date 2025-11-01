// backend/services/mlService.js
const axios = require('axios');

class MLService {
  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.timeout = 30000; // 30 секунд
  }

  /**
   * Отримати прогноз для району
   * @param {number} districtId - ID району (1-6)
   * @param {number} hours - Кількість годин (default: 24)
   * @returns {Promise<Object>}
   */
  async getForecast(districtId, hours = 24) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/forecast/${districtId}`,
        {
          params: { hours, save: true },
          timeout: this.timeout
        }
      );
      return response.data;
    } catch (error) {
      console.error(`❌ Помилка отримання прогнозу для району ${districtId}:`, error.message);
      throw new Error(`ML Service error: ${error.message}`);
    }
  }

  /**
   * Отримати прогнози для всіх районів
   * @param {number} hours - Кількість годин
   * @returns {Promise<Object>}
   */
  async getAllForecasts(hours = 24) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/forecast/all`,
        {
          params: { hours, save: true },
          timeout: this.timeout * 2 // 60 секунд для всіх районів
        }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Помилка отримання прогнозів для всіх районів:', error.message);
      throw new Error(`ML Service error: ${error.message}`);
    }
  }

  /**
   * Натренувати модель для району
   * @param {number} districtId - ID району
   * @param {Object} options - Параметри тренування
   * @returns {Promise<Object>}
   */
  async trainModel(districtId, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/train/${districtId}`,
        {
          days: options.days || 30,
          epochs: options.epochs || 50
        },
        {
          timeout: 300000 // 5 хвилин
        }
      );
      return response.data;
    } catch (error) {
      console.error(`❌ Помилка тренування моделі для району ${districtId}:`, error.message);
      throw new Error(`ML Service error: ${error.message}`);
    }
  }

  /**
   * Отримати інформацію про модель
   * @param {number} districtId - ID району
   * @returns {Promise<Object>}
   */
  async getModelInfo(districtId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/model/${districtId}`,
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error(`❌ Помилка отримання інформації про модель ${districtId}:`, error.message);
      throw new Error(`ML Service error: ${error.message}`);
    }
  }

  /**
   * Перевірити здоров'я ML сервісу
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      const response = await axios.get(
        `${this.baseURL}/health`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.error('❌ ML Service недоступний:', error.message);
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Протестувати ML модель
   */
  async testModel(districtId, days = 30, testSize = 20) {
    try {
      const response = await axios.post(
        `${this.baseURL}/test-model`,
        {
          district_id: districtId,
          days: days,
          test_size: testSize
        },
        {
          timeout: 120000 // 2 хвилини
        }
      );

      return response.data;
    } catch (error) {
      console.error('ML Service testModel error:', error.message);
      throw new Error('Failed to test ML model: ' + error.message);
    }
  }

  /**
   * Отримати інформацію про доступні дані
   */
  async getTestDataInfo(districtId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/test-data-info/${districtId}`,
        { timeout: this.timeout }
      );
      return response.data;
    } catch (error) {
      console.error('ML Service getTestDataInfo error:', error.message);
      throw new Error('Failed to get test data info: ' + error.message);
    }
  }

    /**
   * Протестувати модель на сценарії
   */
  async testScenario(districtId, scenario, customValues) {
    try {
      const response = await axios.post(
        `${this.baseURL}/test-scenario`,
        {
          district_id: districtId,
          scenario: scenario,
          custom_values: customValues
        },
        {
          timeout: 60000 // 1 хвилина
        }
      );

      return response.data;
    } catch (error) {
      console.error('ML Service testScenario error:', error.message);
      throw new Error('Failed to test scenario: ' + error.message);
    }
  }
}

module.exports = new MLService();