// backend/routes/mlTestRoutes.js

const express = require('express');
const router = express.Router();
const mlTestController = require('../controllers/mlTestController');

// Запустити тест моделі
router.post('/run', mlTestController.runModelTest);

// Отримати інфо про доступні дані
router.get('/data-info/:districtId', mlTestController.getTestDataInfo);

module.exports = router;