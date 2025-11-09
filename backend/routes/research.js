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
 * Завантажити шаблон CSV
 */
router.get('/download-template', (req, res) => {
  const template = `timestamp,pm25,pm10,no2,so2,co,o3,temperature,humidity,pressure,wind_speed,wind_direction
2024-01-01 00:00:00,25.5,45.2,35.1,15.2,800,65.3,15.5,75,1013,3.2,180
2024-01-01 01:00:00,23.1,42.8,33.5,14.8,780,63.1,15.2,76,1013,3.0,175
2024-01-01 02:00:00,21.2,40.5,31.2,14.1,760,61.5,14.8,77,1014,2.8,170
2024-01-01 03:00:00,19.8,38.2,29.8,13.5,740,59.8,14.5,78,1014,2.5,165
2024-01-01 04:00:00,18.5,36.1,28.5,13.0,720,58.2,14.2,79,1015,2.3,160`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=air_quality_template.csv');
  res.send(template);
});

module.exports = router;