const mlService = require('../services/mlService');

/**
 * Отримати прогноз для району
 */
exports.getDistrictForecast = async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const hours = parseInt(req.query.hours) || 24;

    // Валідація
    if (districtId < 1 || districtId > 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid district ID. Must be between 1 and 6'
      });
    }

    if (hours < 1 || hours > 168) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hours. Must be between 1 and 168'
      });
    }

    // Отримати прогноз з ML сервісу
    const forecast = await mlService.getForecast(districtId, hours);

    res.json(forecast);
  } catch (error) {
    console.error('Помилка в getDistrictForecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get forecast',
      message: error.message
    });
  }
};

/**
 * Отримати прогнози для всіх районів
 */
exports.getAllDistrictForecasts = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;

    if (hours < 1 || hours > 168) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hours. Must be between 1 and 168'
      });
    }

    // Отримати прогнози з ML сервісу
    const forecasts = await mlService.getAllForecasts(hours);

    res.json(forecasts);
  } catch (error) {
    console.error('Помилка в getAllDistrictForecasts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get forecasts',
      message: error.message
    });
  }
};

/**
 * Натренувати модель для району
 */
exports.trainDistrictModel = async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const { days, epochs } = req.body;

    if (districtId < 1 || districtId > 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid district ID'
      });
    }

    // Натренувати модель
    const result = await mlService.trainModel(districtId, { days, epochs });

    res.json(result);
  } catch (error) {
    console.error('Помилка в trainDistrictModel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to train model',
      message: error.message
    });
  }
};

/**
 * Отримати інформацію про модель
 */
exports.getModelInfo = async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);

    if (districtId < 1 || districtId > 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid district ID'
      });
    }

    const info = await mlService.getModelInfo(districtId);

    res.json(info);
  } catch (error) {
    console.error('Помилка в getModelInfo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model info',
      message: error.message
    });
  }
};

/**
 * Health check ML сервісу
 */
exports.mlHealthCheck = async (req, res) => {
  try {
    const health = await mlService.healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};