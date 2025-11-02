// backend/routes/scenarioModelingRoutes.js
const express = require('express');
const router = express.Router();
const scenarioModelingController = require('../controllers/scenarioModelingController');

// Симуляція сценарію
router.post('/simulate', scenarioModelingController.simulateScenario);

// Готові сценарії
router.get('/presets', scenarioModelingController.getScenarioPresets);

// Повна інформація про район
router.get('/district/:id', scenarioModelingController.getDistrictFullInfo);

module.exports = router;