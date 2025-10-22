// server.js - Головний файл сервера

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

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

// Імпорт маршрутів
const authRoutes = require('./routes/authRoutes');

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

// API маршрути
app.use('/api/auth', authRoutes);

// Обробка 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не знайдено'
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
});

module.exports = app;