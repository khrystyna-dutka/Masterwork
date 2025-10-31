// src/services/mlTestService.js

import api from './api';

const mlTestService = {
  /**
   * Запустити тест ML моделі
   */
  runTest: async (districtId, days = 30, testSize = 20) => {
    try {
      const response = await api.post('/ml-test/run', {
        districtId,
        days,
        testSize
      });
      return response.data;
    } catch (error) {
      console.error('Error running test:', error);
      throw error;
    }
  },

  /**
   * Отримати інформацію про доступні дані
   */
  getDataInfo: async (districtId) => {
    try {
      const response = await api.get(`/ml-test/data-info/${districtId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting data info:', error);
      throw error;
    }
  }
};

export default mlTestService;