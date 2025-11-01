// backend/controllers/scenarioTestController.js

const mlService = require('../services/mlService');

/**
 * Протестувати ML модель на екстремальному сценарії
 */
exports.runScenarioTest = async (req, res) => {
  try {
    const { districtId, scenario, customValues } = req.body;

    console.log(`🔥 Запуск сценарного тесту для району ${districtId}...`);
    console.log(`   Сценарій: ${scenario}`);

    // Викликаємо ML сервіс
    const result = await mlService.testScenario(districtId, scenario, customValues);

    res.json(result);

  } catch (error) {
    console.error('❌ Error running scenario test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run scenario test',
      message: error.message
    });
  }
};

/**
 * Отримати список доступних сценаріїв
 */
exports.getScenarios = async (req, res) => {
  try {
    const scenarios = [
      {
        id: 'fire',
        name: 'Пожежа / Смог',
        description: 'Різке збільшення PM2.5 і PM10 через пожежу чи смог',
        icon: '🔥',
        values: {
          pm25: 250,
          pm10: 300,
          no2: 80,
          so2: 50,
          co: 2000,
          o3: 120,
          temperature: 28,
          humidity: 45,
          pressure: 1013,
          wind_speed: 2,
          wind_direction: 180
        }
      },
      {
        id: 'industrial_accident',
        name: 'Аварія на заводі',
        description: 'Викид промислових газів - високі NO2, SO2, CO',
        icon: '🏭',
        values: {
          pm25: 80,
          pm10: 120,
          no2: 200,
          so2: 150,
          co: 3500,
          o3: 40,
          temperature: 22,
          humidity: 55,
          pressure: 1015,
          wind_speed: 3,
          wind_direction: 90
        }
      },
      {
        id: 'heavy_fog',
        name: 'Густий туман',
        description: 'Висока вологість, підвищені PM10, застій повітря',
        icon: '🌫️',
        values: {
          pm25: 65,
          pm10: 150,
          no2: 60,
          so2: 40,
          co: 800,
          o3: 30,
          temperature: 8,
          humidity: 95,
          pressure: 1010,
          wind_speed: 0.5,
          wind_direction: 0
        }
      },
      {
        id: 'strong_wind',
        name: 'Сильний вітер',
        description: 'Швидке розсіювання забруднень',
        icon: '💨',
        values: {
          pm25: 12,
          pm10: 25,
          no2: 20,
          so2: 15,
          co: 400,
          o3: 60,
          temperature: 18,
          humidity: 60,
          pressure: 1020,
          wind_speed: 15,
          wind_direction: 270
        }
      },
      {
        id: 'normal',
        name: 'Нормальні умови',
        description: 'Типові показники для Львова',
        icon: '✅',
        values: {
          pm25: 25,
          pm10: 40,
          no2: 35,
          so2: 25,
          co: 600,
          o3: 70,
          temperature: 15,
          humidity: 65,
          pressure: 1013,
          wind_speed: 5,
          wind_direction: 180
        }
      }
    ];

    res.json({
      success: true,
      scenarios
    });

  } catch (error) {
    console.error('❌ Error getting scenarios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;