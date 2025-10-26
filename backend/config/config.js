// config/config.js - Центральна конфігурація додатку

module.exports = {
  // Налаштування сервера
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development'
  },

  // JWT налаштування
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || '30d',
    cookieExpire: 30 // днів
  },

  // CORS налаштування
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },

  // Налаштування бази даних
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'ecolv_db'
  },

  // API ключі
  apiKeys: {
    openWeather: process.env.OPENWEATHER_API_KEY,
    googleMaps: process.env.GOOGLE_MAPS_API_KEY
  },

  // Налаштування районів Львова
  districts: [
    { id: 1, name: 'Галицький', latitude: 49.8403, longitude: 24.0323 },
    { id: 2, name: 'Франківський', latitude: 49.8176, longitude: 23.9888 },
    { id: 3, name: 'Залізничний', latitude: 49.8356, longitude: 23.9305 },
    { id: 4, name: 'Шевченківський', latitude: 49.8662, longitude: 24.0348 },
    { id: 5, name: 'Личаківський', latitude: 49.8193, longitude: 24.0684 },
    { id: 6, name: 'Сихівський', latitude: 49.8107, longitude: 24.0457 }
  ],

  // Пороги для якості повітря (AQI)
  airQualityThresholds: {
    good: { min: 0, max: 50, label: 'Добра', color: '#10b981' },
    moderate: { min: 51, max: 100, label: 'Помірна', color: '#f59e0b' },
    unhealthySensitive: { min: 101, max: 150, label: 'Нездорова для чутливих', color: '#f97316' },
    unhealthy: { min: 151, max: 200, label: 'Нездорова', color: '#ef4444' },
    veryUnhealthy: { min: 201, max: 300, label: 'Дуже нездорова', color: '#9333ea' },
    hazardous: { min: 301, max: 500, label: 'Небезпечна', color: '#7f1d1d' }
  }
};