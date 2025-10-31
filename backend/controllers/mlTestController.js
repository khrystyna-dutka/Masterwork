// backend/controllers/mlTestController.js

const mlService = require('../services/mlService');

/**
 * Запустити тест ML моделі
 */
exports.runModelTest = async (req, res) => {
  try {
    const { districtId, days, testSize } = req.body;

    console.log(`🧪 Запуск тесту моделі для району ${districtId}...`);
    console.log(`   Дані за ${days} днів, test size: ${testSize}%`);

    // Викликаємо ML сервіс для тестування
    const testResult = await mlService.testModel(districtId, days, testSize);

    res.json(testResult);

  } catch (error) {
    console.error('❌ Error running model test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run model test',
      message: error.message
    });
  }
};

/**
 * Отримати інформацію про доступні дані для тестування
 */
exports.getTestDataInfo = async (req, res) => {
  try {
    const { districtId } = req.params;

    const info = await mlService.getTestDataInfo(districtId);

    res.json(info);

  } catch (error) {
    console.error('❌ Error getting test data info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test data info',
      message: error.message
    });
  }
};

module.exports = exports;