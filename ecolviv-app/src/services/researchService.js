// src/services/researchService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/research';

class ResearchService {
  /**
   * Тренування custom моделі
   */
  async trainCustomModel(file, config) {
    try {
      const formData = new FormData();
      formData.append('dataset', file);
      formData.append('config', JSON.stringify(config));

      console.log('📤 Відправка датасету на сервер...');
      console.log('Файл:', file.name);
      console.log('Конфігурація:', config);

      const response = await axios.post(`${API_URL}/train-custom-model`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 600000, // 10 хвилин
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ Помилка тренування:', error);
      throw error;
    }
  }

  /**
   * Завантажити шаблон CSV
   */
  downloadTemplate() {
    window.open(`${API_URL}/download-template`, '_blank');
  }
}

export default new ResearchService();