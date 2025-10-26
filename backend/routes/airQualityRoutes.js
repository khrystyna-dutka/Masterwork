// backend/routes/airQualityRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCurrentAirQuality,
  getDistrictAirQuality,
  getDistricts,
  getDistrictHistory
} = require('../controllers/airQualityController');

// Публічні маршрути
router.get('/districts', getDistricts);
router.get('/current', getCurrentAirQuality);
router.get('/district/:districtId', getDistrictAirQuality);
router.get('/district/:districtId/history', getDistrictHistory);

module.exports = router;