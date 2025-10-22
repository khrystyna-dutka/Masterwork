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

  // Налаштування бази даних (буде додано пізніше)
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
    { id: 1, name: 'Галицький', lat: 49.8397, lng: 24.0297 },
    { id: 2, name: 'Залізничний', lat: 49.8326, lng: 23.9934 },
    { id: 3, name: 'Личаківський', lat: 49.8258, lng: 24.0614 },
    { id: 4, name: 'Сихівський', lat: 49.8044, lng: 23.9869 },
    { id: 5, name: 'Франківський', lat: 49.8083, lng: 24.0181 },
    { id: 6, name: 'Шевченківський', lat: 49.8550, lng: 24.0050 }
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
