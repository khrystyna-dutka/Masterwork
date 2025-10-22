// utils/helpers.js - Допоміжні функції

/**
 * Обчислення AQI на основі концентрації забруднювачів
 * @param {Object} pollutants - Об'єкт з концентраціями забруднювачів
 * @returns {Object} - AQI значення та статус
 */
const calculateAQI = (pollutants) => {
  const { pm25, pm10, no2, so2, co, o3 } = pollutants;
  
  // Спрощена формула обчислення AQI (US EPA стандарт)
  const pm25AQI = pm25 ? Math.round(pm25 * 2) : 0;
  const pm10AQI = pm10 ? Math.round(pm10 * 1.5) : 0;
  const no2AQI = no2 ? Math.round(no2 * 0.5) : 0;
  
  // Беремо максимальне значення
  const aqi = Math.max(pm25AQI, pm10AQI, no2AQI);
  
  return {
    value: aqi,
    status: getAQIStatus(aqi)
  };
};

/**
 * Отримання статусу якості повітря на основі AQI
 * @param {number} aqi - Значення AQI
 * @returns {Object} - Статус і колір
 */
const getAQIStatus = (aqi) => {
  if (aqi <= 50) {
    return { level: 'Добра', color: '#10b981', description: 'Якість повітря задовільна' };
  } else if (aqi <= 100) {
    return { level: 'Помірна', color: '#f59e0b', description: 'Прийнятна якість повітря' };
  } else if (aqi <= 150) {
    return { level: 'Нездорова для чутливих', color: '#f97316', description: 'Може вплинути на чутливі групи' };
  } else if (aqi <= 200) {
    return { level: 'Нездорова', color: '#ef4444', description: 'Всі можуть відчути вплив на здоров\'я' };
  } else if (aqi <= 300) {
    return { level: 'Дуже нездорова', color: '#9333ea', description: 'Серйозні ризики для здоров\'я' };
  } else {
    return { level: 'Небезпечна', color: '#7f1d1d', description: 'Надзвичайно небезпечна якість повітря' };
  }
};

/**
 * Форматування дати в український формат
 * @param {Date} date - Дата
 * @returns {string} - Відформатована дата
 */
const formatDate = (date) => {
  return new Date(date).toLocaleString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Генерація випадкових даних для тестування
 * @returns {Object} - Тестові дані про якість повітря
 */
const generateMockAirQualityData = () => {
  return {
    pm25: Math.floor(Math.random() * 100) + 10,
    pm10: Math.floor(Math.random() * 150) + 20,
    no2: Math.floor(Math.random() * 80) + 5,
    so2: Math.floor(Math.random() * 50) + 2,
    co: Math.floor(Math.random() * 300) + 50,
    o3: Math.floor(Math.random() * 120) + 10
  };
};

/**
 * Валідація email адреси
 * @param {string} email - Email адреса
 * @returns {boolean} - Результат валідації
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Генерація випадкового токену
 * @param {number} length - Довжина токену
 * @returns {string} - Випадковий токен
 */
const generateToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Затримка виконання (для тестування)
 * @param {number} ms - Мілісекунди
 * @returns {Promise} - Promise з затримкою
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  calculateAQI,
  getAQIStatus,
  formatDate,
  generateMockAirQualityData,
  isValidEmail,
  generateToken,
  delay
};
