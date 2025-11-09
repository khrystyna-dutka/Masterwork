// backend/routes/research.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Налаштування multer для завантаження файлів
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Тільки CSV файли дозволені'), false);
    }
  }
});

/**
 * POST /api/research/train-custom-model
 * Тренування custom моделі на user's датасеті
 */
router.post('/train-custom-model', upload.single('dataset'), async (req, res) => {
  try {
    console.log('\n📚 ЗАПИТ НА ТРЕНУВАННЯ CUSTOM МОДЕЛІ');
    console.log('Файл:', req.file?.originalname);
    console.log('Конфігурація:', req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл не завантажено'
      });
    }

    // Парсимо конфігурацію з JSON string
    const config = JSON.parse(req.body.config);

    console.log('✅ Файл збережено:', req.file.path);
    console.log('📋 Конфігурація:', config);

    // Створюємо FormData для відправки до ML-сервісу
    const formData = new FormData();
    formData.append('dataset', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: 'text/csv'
    });
    formData.append('config', JSON.stringify(config));

    console.log('🚀 Відправляємо на ML-сервіс...');

    // Відправляємо на ML-сервіс
    const response = await axios.post(
      `${ML_SERVICE_URL}/api/research/train-custom`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 600000 // 10 хвилин
      }
    );

    console.log('✅ Отримано відповідь від ML-сервісу');

    // Видаляємо тимчасовий файл
    fs.unlinkSync(req.file.path);

    res.json(response.data);

  } catch (error) {
    console.error('❌ Помилка тренування:', error.message);
    
    // Видаляємо файл у разі помилки
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Помилка тренування моделі',
      message: error.response?.data?.error || error.message
    });
  }
});

/**
 * GET /api/research/download-template
 * Завантажити шаблон CSV з більшою кількістю даних
 */
router.get('/download-template', (req, res) => {
  const rows = [];
  const startDate = new Date('2024-01-01T00:00:00');
  
  // 🆕 Змінюємо 100 на 1000!
  for (let i = 0; i < 1000; i++) {
    const date = new Date(startDate.getTime() + i * 3600000);
    const hour = date.getHours();
    const day = Math.floor(i / 24);
    
    // Більш реалістичні значення з трендами
    const weekendEffect = (day % 7 >= 5) ? 0.7 : 1.0;
    const rushHourEffect = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1.3 : 1.0;
    
    const pm25 = (20 + Math.sin(i / 50) * 10 + Math.sin(hour / 24 * Math.PI) * 5) * weekendEffect * rushHourEffect + Math.random() * 3;
    const pm10 = pm25 * 1.5 + Math.random() * 5;
    const no2 = (30 + Math.cos(i / 40) * 10 + Math.sin(hour / 12 * Math.PI) * 8) * rushHourEffect + Math.random() * 3;
    const so2 = 15 + Math.sin(i / 60) * 5 + Math.random() * 2;
    const co = (700 + Math.cos(i / 30) * 200 + Math.sin(hour / 12 * Math.PI) * 100) * rushHourEffect + Math.random() * 30;
    const o3 = Math.max(0, 60 + Math.sin((hour - 12) / 12 * Math.PI) * 30 + Math.random() * 10);
    
    const temp = 15 + Math.sin((day / 365) * Math.PI * 2) * 10 + Math.sin((hour - 6) / 12 * Math.PI) * 8;
    const humidity = 65 + Math.cos((hour - 12) / 12 * Math.PI) * 15 + Math.random() * 5;
    const pressure = 1013 + Math.sin(day / 30 * Math.PI) * 10 + Math.random() * 3;
    const windSpeed = 3 + Math.sin(i / 20) * 2 + Math.random() * 2;
    const windDirection = Math.floor(Math.random() * 360);
    
    const timestamp = date.toISOString().replace('T', ' ').substring(0, 19);
    
    rows.push(
      `${timestamp},${pm25.toFixed(1)},${pm10.toFixed(1)},${no2.toFixed(1)},${so2.toFixed(1)},${co.toFixed(1)},${o3.toFixed(1)},${temp.toFixed(1)},${humidity.toFixed(1)},${pressure.toFixed(1)},${windSpeed.toFixed(1)},${windDirection}`
    );
  }
  
  const template = `timestamp,pm25,pm10,no2,so2,co,o3,temperature,humidity,pressure,wind_speed,wind_direction\n${rows.join('\n')}`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=air_quality_template_1000rows.csv');
  res.send(template);
});

module.exports = router;