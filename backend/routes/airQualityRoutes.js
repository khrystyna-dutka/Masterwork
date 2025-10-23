// backend/routes/airQualityRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCurrentAirQuality,
  getDistrictAirQuality,
  getDistricts
} = require('../controllers/airQualityController');

// Публічні маршрути
router.get('/districts', getDistricts);
router.get('/current', getCurrentAirQuality);
router.get('/district/:districtId', getDistrictAirQuality);

module.exports = router;