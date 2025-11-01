// src/services/scenarioTestService.js

import api from './api';

const scenarioTestService = {
  /**
   * Отримати список доступних сценаріїв
   */
  getScenarios: async () => {
    try {
      const response = await api.get('/scenario-test/scenarios');
      return response.data;
    } catch (error) {
      console.error('Error getting scenarios:', error);
      throw error;
    }
  },

  /**
   * Запустити сценарний тест
   */
  runTest: async (districtId, scenario, customValues = null) => {
    try {
      const response = await api.post('/scenario-test/run', {
        districtId,
        scenario,
        customValues
      });
      return response.data;
    } catch (error) {
      console.error('Error running scenario test:', error);
      throw error;
    }
  }
};

export default scenarioTestService;