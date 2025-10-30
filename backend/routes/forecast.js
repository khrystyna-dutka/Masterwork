// backend/routes/forecast.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * GET /api/forecast/district/:districtId
 * Отримати прогноз для району
 */
router.get('/district/:districtId', async (req, res) => {
  try {
    const { districtId } = req.params;
    const hours = req.query.hours || 24;

    console.log(`📊 Запит прогнозу: район ${districtId}, ${hours} годин`);

    // Викликати ML сервіс
    const response = await axios.get(
      `${ML_SERVICE_URL}/api/predict/${districtId}`,
      {
        params: { hours },
        timeout: 30000
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Помилка отримання прогнозу:', error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * GET /api/forecast/all
 * Отримати прогнози для всіх районів
 */
router.get('/all', async (req, res) => {
  try {
    const hours = req.query.hours || 24;

    console.log(`📊 Запит прогнозів для всіх районів: ${hours} годин`);

    const response = await axios.get(
      `${ML_SERVICE_URL}/api/predict/all`,
      {
        params: { hours },
        timeout: 60000
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Помилка отримання прогнозів:', error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
});

/**
 * GET /api/forecast/health
 * Перевірка ML сервісу
 */
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({
      success: true,
      ml_service: response.data
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'ML Service unavailable',
      details: error.message
    });
  }
});

module.exports = router;