// backend/routes/scenarioTestRoutes.js

const express = require('express');
const router = express.Router();
const scenarioTestController = require('../controllers/scenarioTestController');

// Запустити сценарний тест
router.post('/run', scenarioTestController.runScenarioTest);

// Отримати список сценаріїв
router.get('/scenarios', scenarioTestController.getScenarios);

module.exports = router;