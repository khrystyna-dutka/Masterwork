// backend/controllers/airQualityController.js
const airQualityService = require('../services/airQualityService');
const config = require('../config/config');

/**
 * Отримати поточні дані про якість повітря для всіх районів
 */
exports.getCurrentAirQuality = async (req, res) => {
  try {
    const airQualityData = await airQualityService.getAllDistrictsAirQuality();
    
    res.json({
      success: true,
      count: airQualityData.length,
      data: airQualityData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getCurrentAirQuality:', error);
    res.status(500).json({
      success: false,
      message: 'Не вдалося отримати дані про якість повітря',
      error: error.message
    });
  }
};

/**
 * Отримати дані про якість повітря для конкретного району
 */
exports.getDistrictAirQuality = async (req, res) => {
  try {
    const { districtId } = req.params;
    const district = config.districts.find(d => d.id === parseInt(districtId));
    
    if (!district) {
      return res.status(404).json({
        success: false,
        message: 'Район не знайдено'
      });
    }

    const airQualityData = await airQualityService.getDistrictAirQuality(district);
    const status = airQualityService.getAQIStatus(airQualityData.aqi);
    
    res.json({
      success: true,
      data: {
        ...airQualityData,
        status
      }
    });
  } catch (error) {
    console.error('Error in getDistrictAirQuality:', error);
    res.status(500).json({
      success: false,
      message: 'Не вдалося отримати дані про якість повітря',
      error: error.message
    });
  }
};

/**
 * Отримати список всіх районів
 */
exports.getDistricts = async (req, res) => {
  try {
    res.json({
      success: true,
      count: config.districts.length,
      data: config.districts
    });
  } catch (error) {
    console.error('Error in getDistricts:', error);
    res.status(500).json({
      success: false,
      message: 'Не вдалося отримати список районів',
      error: error.message
    });
  }
};

/**
 * Отримати історію даних для району
 */
exports.getDistrictHistory = async (req, res) => {
  try {
    const { districtId } = req.params;
    const { period = '24h' } = req.query;
    
    const historyService = require('../services/airQualityHistoryService');
    const history = await historyService.getDistrictHistory(parseInt(districtId), period);
    const stats = await historyService.getDistrictStats(parseInt(districtId), period);
    
    res.json({
      success: true,
      districtId: parseInt(districtId),
      period,
      count: history.length,
      data: history,
      stats
    });
  } catch (error) {
    console.error('Error in getDistrictHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Не вдалося отримати історію даних',
      error: error.message
    });
  }
};