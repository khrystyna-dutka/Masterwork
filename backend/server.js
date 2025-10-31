// server.js - Головний файл сервера

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const app = express();
const forecastRoutes = require('./routes/forecast');

// Налаштування безпеки
app.use(helmet());

// CORS налаштування
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Логування запитів
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Парсинг JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/forecast', forecastRoutes);
console.log('✅ Forecast routes підключено');

// Базовий маршрут
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EcoLviv API працює успішно! 🌱',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Імпорт маршрутів
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes підключено');
} catch (error) {
  console.error('❌ Помилка підключення auth routes:', error.message);
}

try {
  const airQualityRoutes = require('./routes/airQualityRoutes');
  app.use('/api/air-quality', airQualityRoutes);
  console.log('✅ Air Quality routes підключено');
} catch (error) {
  console.error('❌ Помилка підключення air-quality routes:', error.message);
}

try {
  const subscriptionsRoutes = require('./routes/subscriptionsRoutes');
  app.use('/api/subscriptions', subscriptionsRoutes);
  console.log('✅ Subscriptions routes підключено');
} catch (error) {
  console.error('❌ Помилка підключення subscriptions routes:', error.message);
}

try {
  const mlTestRoutes = require('./routes/mlTestRoutes');
  app.use('/api/ml-test', mlTestRoutes);
  console.log('✅ ML Test routes підключено');
} catch (error) {
  console.error('❌ Помилка підключення ml-test routes:', error.message);
}

// ========================================
// ТЕСТОВІ ENDPOINTS (тільки для development)
// ========================================
if (process.env.NODE_ENV === 'development') {
  // Ручний збір даних про якість повітря
  app.post('/api/test/collect-data', async (req, res) => {
    try {
      const airQualityHistoryService = require('./services/airQualityHistoryService');
      console.log('🧪 Тестовий збір даних...');
      const result = await airQualityHistoryService.saveCurrentDataToHistory();
      res.json({ 
        success: true, 
        message: 'Дані успішно зібрано',
        result 
      });
    } catch (error) {
      console.error('Помилка тестового збору:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Перевірка OpenWeather API
  app.get('/api/test/weather/:lat/:lon', async (req, res) => {
    try {
      const airQualityService = require('./services/airQualityService');
      const { lat, lon } = req.params;
      
      console.log(`🧪 Тест OpenWeather для [${lat}, ${lon}]...`);
      
      const weatherData = await airQualityService.getWeatherData(parseFloat(lat), parseFloat(lon));
      const airQualityData = await airQualityService.getOpenWeatherAirQuality(parseFloat(lat), parseFloat(lon));
      
      res.json({ 
        success: true,
        weather: weatherData,
        airQuality: airQualityData
      });
    } catch (error) {
      console.error('Помилка тесту:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Тестова відправка email
  app.post('/api/test/send-daily-emails', async (req, res) => {
    try {
      const { protect } = require('./middleware/auth');
      
      // Перевірка аутентифікації
      await new Promise((resolve, reject) => {
        protect(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const { triggerTestEmail } = require('./services/cronJobs');
      const result = await triggerTestEmail();
      
      res.json({ 
        success: true, 
        message: 'Тестова відправка email завершена',
        result 
      });
    } catch (error) {
      console.error('Помилка тестової відправки:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  console.log('✅ Тестові endpoints підключено:');
  console.log('   POST /api/test/collect-data');
  console.log('   GET /api/test/weather/:lat/:lon');
  console.log('   POST /api/test/send-daily-emails');
}

// Обробка 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не знайдено',
    path: req.path
  });
});

// Глобальна обробка помилок
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Внутрішня помилка сервера',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🌱 EcoLviv Backend Server`);
  console.log(`📡 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Сервер запущено на порту ${PORT}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`⏰ Час запуску: ${new Date().toLocaleString('uk-UA')}`);
  console.log('='.repeat(50));
  
  // Запуск schedulers
  try {
    // Scheduler для збору даних про якість повітря
    const airQualityScheduler = require('./jobs/airQualityScheduler');
    airQualityScheduler.start();
    console.log('✅ Air Quality Scheduler запущено');
  } catch (error) {
    console.error('⚠️ Air Quality Scheduler не запущено:', error.message);
  }

  // Scheduler для щоденних email сповіщень
  if (process.env.NODE_ENV !== 'test') {
    try {
      const { startDailyEmailCron } = require('./services/cronJobs');
      startDailyEmailCron();
      console.log('✅ Daily Email Scheduler запущено');
    } catch (error) {
      console.error('⚠️ Daily Email Scheduler не запущено:', error.message);
      console.error('   Можливо, не налаштовано email конфігурацію в .env');
    }
  }
  
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM отримано. Закриваю сервер...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT отримано. Закриваю сервер...');
  process.exit(0);
});

module.exports = app;
