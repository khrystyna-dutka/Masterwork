const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');

/**
 * @route   GET /api/forecast/health
 * @desc    Перевірити стан ML сервісу
 * @access  Public
 */
router.get('/health', forecastController.mlHealthCheck);

/**
 * @route   GET /api/forecast/district/:districtId
 * @desc    Отримати прогноз для району
 * @access  Public
 */
router.get('/district/:districtId', forecastController.getDistrictForecast);

/**
 * @route   GET /api/forecast/all
 * @desc    Отримати прогнози для всіх районів
 * @access  Public
 */
router.get('/all', forecastController.getAllDistrictForecasts);

/**
 * @route   POST /api/forecast/train/:districtId
 * @desc    Натренувати модель для району
 * @access  Private (Admin only)
 */
router.post('/train/:districtId', forecastController.trainDistrictModel);

/**
 * @route   GET /api/forecast/model/:districtId
 * @desc    Отримати інформацію про модель
 * @access  Public
 */
router.get('/model/:districtId', forecastController.getModelInfo);

module.exports = router;