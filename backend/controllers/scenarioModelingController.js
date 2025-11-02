// backend/controllers/scenarioModelingController.js
const { query } = require('../config/database');

/**
 * КОЕФІЦІЄНТИ ВПЛИВУ параметрів на забруднення
 * Базуються на наукових дослідженнях
 */
const IMPACT_COEFFICIENTS = {
  // Вплив трафіку (1% зміни трафіку)
  traffic: {
    pm25: 0.65,   // +1% трафіку = +0.65% PM2.5
    pm10: 0.55,
    no2: 0.85,    // найбільший вплив на NO₂
    so2: 0.25,
    co: 0.75,
    o3: -0.15     // більше трафіку = менше O₃ (споживається)
  },
  
  // Вплив зелених зон (1% зміни покриття деревами)
  trees: {
    pm25: -0.45,  // +1% дерев = -0.45% PM2.5
    pm10: -0.35,
    no2: -0.20,
    so2: -0.15,
    co: -0.10,
    o3: 0.30      // більше дерев = більше O₃ від фотосинтезу
  },
  
  // Вплив промислових зон (1 нова зона)
  industry: {
    pm25: 2.5,    // +1 промзона = +2.5% PM2.5
    pm10: 3.0,
    no2: 1.8,
    so2: 4.5,     // найбільший вплив на SO₂
    co: 2.0,
    o3: -0.5
  },
  
  // Вплив населення (1000 осіб)
  population: {
    pm25: 0.08,
    pm10: 0.10,
    no2: 0.12,
    so2: 0.05,
    co: 0.15,
    o3: -0.05
  }
};

/**
 * Безпечні пороги якості повітря (WHO guidelines)
 */
const SAFE_THRESHOLDS = {
  pm25: 15.0,   // μg/m³
  pm10: 45.0,
  no2: 40.0,
  so2: 20.0,
  co: 4000.0,
  o3: 100.0
};

/**
 * Розрахувати зміну забруднення на основі змін параметрів
 */
function calculatePollutionChange(baseValues, districtData, changes) {
  const results = {};
  const pollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
  
  pollutants.forEach(pollutant => {
    let totalChange = 0;
    
    // 1. Вплив зміни трафіку
    if (changes.traffic_change !== undefined && changes.traffic_change !== 0) {
      const trafficImpact = changes.traffic_change * IMPACT_COEFFICIENTS.traffic[pollutant];
      totalChange += trafficImpact;
    }
    
    // 2. Вплив зміни дерев
    if (changes.trees_change !== undefined && changes.trees_change !== 0) {
      const treesImpact = changes.trees_change * IMPACT_COEFFICIENTS.trees[pollutant];
      totalChange += treesImpact;
    }
    
    // 3. Вплив зміни промзон
    if (changes.industry_change !== undefined && changes.industry_change !== 0) {
      const industryImpact = changes.industry_change * IMPACT_COEFFICIENTS.industry[pollutant];
      totalChange += industryImpact;
    }
    
    // 4. Вплив зміни населення (у тисячах)
    if (changes.population_change !== undefined && changes.population_change !== 0) {
      const populationImpact = (changes.population_change / 1000) * IMPACT_COEFFICIENTS.population[pollutant];
      totalChange += populationImpact;
    }
    
    // Розрахувати нове значення
    const baseValue = baseValues[pollutant] || 0;
    const changePercent = totalChange / 100; // конвертуємо % в десяткові
    const newValue = baseValue * (1 + changePercent);
    
    // Не може бути негативним
    results[pollutant] = Math.max(0, parseFloat(newValue.toFixed(2)));
  });
  
  return results;
}

/**
 * Розрахувати AQI з PM2.5
 */
function calculateAQI(pm25) {
  if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
  if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
  if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
  if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201);
  return Math.round(((500 - 301) / (500.4 - 250.5)) * (pm25 - 250.5) + 301);
}

/**
 * Отримати статус AQI
 */
function getAQIStatus(aqi) {
  if (aqi <= 50) return 'Добра';
  if (aqi <= 100) return 'Помірна';
  if (aqi <= 150) return 'Нездорова для чутливих';
  if (aqi <= 200) return 'Нездорова';
  if (aqi <= 300) return 'Дуже нездорова';
  return 'Небезпечна';
}

/**
 * Головний endpoint для моделювання сценарію
 * POST /api/scenario-modeling/simulate
 */
exports.simulateScenario = async (req, res) => {
  try {
    const { district_id, changes, scenario_name } = req.body;
    
    console.log(`\n🎯 Сценарне моделювання для району ${district_id}`);
    console.log('📝 Зміни:', changes);
    
    // 1. Отримати інформацію про район
    const districtResult = await query(
      `SELECT * FROM districts WHERE id = $1`,
      [district_id]
    );
    
    if (districtResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Район не знайдено'
      });
    }
    
    const district = districtResult.rows[0];
    
    // 2. Отримати поточні дані про якість повітря
    const airQualityResult = await query(
      `SELECT pm25, pm10, no2, so2, co, o3, aqi, aqi_status, measured_at
       FROM air_quality_history
       WHERE district_id = $1 AND is_forecast = false
       ORDER BY measured_at DESC
       LIMIT 1`,
      [district_id]
    );
    
    if (airQualityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Немає даних про якість повітря для цього району'
      });
    }
    
    const currentAirQuality = airQualityResult.rows[0];
    
    // 3. Розрахувати нові значення після змін
    const newPollutionLevels = calculatePollutionChange(
      currentAirQuality,
      district,
      changes
    );
    
    // 4. Розрахувати новий AQI
    const newAQI = calculateAQI(newPollutionLevels.pm25);
    const newStatus = getAQIStatus(newAQI);
    
    // 5. Розрахувати зміни у параметрах району
    const newDistrictParams = {
      traffic_level: district.traffic_level + (changes.traffic_change || 0),
      tree_coverage: district.tree_coverage_percent + (changes.trees_change || 0),
      industrial_zones: district.industrial_zones + (changes.industry_change || 0),
      population: district.population + (changes.population_change || 0)
    };
    
    // Обмеження
    newDistrictParams.traffic_level = Math.max(0, Math.min(100, newDistrictParams.traffic_level));
    newDistrictParams.tree_coverage = Math.max(0, Math.min(100, newDistrictParams.tree_coverage));
    newDistrictParams.industrial_zones = Math.max(0, newDistrictParams.industrial_zones);
    
    // 6. Порівняння з безпечними порогами
    const safetyAnalysis = {};
    Object.keys(SAFE_THRESHOLDS).forEach(pollutant => {
      const current = currentAirQuality[pollutant];
      const predicted = newPollutionLevels[pollutant];
      const threshold = SAFE_THRESHOLDS[pollutant];
      
      safetyAnalysis[pollutant] = {
        current: parseFloat(current),
        predicted: parseFloat(predicted),
        threshold: threshold,
        change_percent: ((predicted - current) / current * 100).toFixed(1),
        is_safe_now: current <= threshold,
        will_be_safe: predicted <= threshold,
        improvement: predicted < current
      };
    });
    
    // 7. Підготувати відповідь
    const response = {
      success: true,
      scenario_name: scenario_name || 'Користувацький сценарій',
      district: {
        id: district.id,
        name: district.name,
        name_en: district.name_en
      },
      current_state: {
        air_quality: {
          pm25: parseFloat(currentAirQuality.pm25),
          pm10: parseFloat(currentAirQuality.pm10),
          no2: parseFloat(currentAirQuality.no2),
          so2: parseFloat(currentAirQuality.so2),
          co: parseFloat(currentAirQuality.co),
          o3: parseFloat(currentAirQuality.o3),
          aqi: currentAirQuality.aqi,
          status: currentAirQuality.aqi_status
        },
        district_params: {
          traffic_level: district.traffic_level,
          tree_coverage: district.tree_coverage_percent,
          industrial_zones: district.industrial_zones,
          population: district.population
        }
      },
      applied_changes: changes,
      predicted_state: {
        air_quality: {
          ...newPollutionLevels,
          aqi: newAQI,
          status: newStatus
        },
        district_params: newDistrictParams
      },
      impact_analysis: safetyAnalysis,
      summary: {
        aqi_change: newAQI - currentAirQuality.aqi,
        aqi_change_percent: (((newAQI - currentAirQuality.aqi) / currentAirQuality.aqi) * 100).toFixed(1),
        overall_improvement: newAQI < currentAirQuality.aqi,
        safe_pollutants_count: Object.values(safetyAnalysis).filter(p => p.will_be_safe).length,
        improved_pollutants: Object.keys(safetyAnalysis).filter(
          key => safetyAnalysis[key].improvement
        )
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Моделювання завершено:`);
    console.log(`   AQI: ${currentAirQuality.aqi} → ${newAQI} (${response.summary.aqi_change > 0 ? '+' : ''}${response.summary.aqi_change})`);
    console.log(`   Покращення: ${response.summary.improved_pollutants.length}/6 параметрів`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Помилка моделювання:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при моделюванні сценарію',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Отримати готові сценарії
 * GET /api/scenario-modeling/presets
 */
exports.getScenarioPresets = async (req, res) => {
  try {
    const presets = [
      {
        id: 'green_city',
        name: '🌳 Зелене місто',
        description: 'Збільшення паркових зон та озеленення на 25%',
        icon: 'trees',
        changes: {
          trees_change: 25,
          traffic_change: 0,
          industry_change: 0,
          population_change: 0
        },
        expected_impact: 'Зниження PM2.5 на ~10-12%'
      },
      {
        id: 'pedestrian_zone',
        name: '🚶 Пішохідна зона',
        description: 'Зменшення автомобільного руху на 40%',
        icon: 'walking',
        changes: {
          trees_change: 0,
          traffic_change: -40,
          industry_change: 0,
          population_change: 0
        },
        expected_impact: 'Зниження NO₂ та CO на ~30-35%'
      },
      {
        id: 'eco_transport',
        name: '🚲 Екотранспорт',
        description: 'Зменшення трафіку на 25% + збільшення зелені на 15%',
        icon: 'bike',
        changes: {
          trees_change: 15,
          traffic_change: -25,
          industry_change: 0,
          population_change: 0
        },
        expected_impact: 'Комплексне покращення якості повітря'
      },
      {
        id: 'new_park',
        name: '🏞️ Новий парк',
        description: 'Створення великого парку (+30% зелені) замість парковки (-15% трафіку)',
        icon: 'park',
        changes: {
          trees_change: 30,
          traffic_change: -15,
          industry_change: 0,
          population_change: 0
        },
        expected_impact: 'Значне покращення якості повітря'
      },
      {
        id: 'industrial_expansion',
        name: '🏭 Промислова експансія',
        description: 'Додавання 5 нових промислових об\'єктів',
        icon: 'factory',
        changes: {
          trees_change: 0,
          traffic_change: 10,
          industry_change: 5,
          population_change: 0
        },
        expected_impact: 'Погіршення якості повітря на 15-20%',
        negative: true
      },
      {
        id: 'new_residential',
        name: '🏘️ Новий житловий масив',
        description: 'Збільшення населення на 15000 + нові дороги',
        icon: 'home',
        changes: {
          trees_change: -10,
          traffic_change: 20,
          industry_change: 0,
          population_change: 15000
        },
        expected_impact: 'Погіршення якості повітря',
        negative: true
      },
      {
        id: 'balanced_development',
        name: '⚖️ Збалансований розвиток',
        description: 'Розвиток інфраструктури з урахуванням екології',
        icon: 'balance',
        changes: {
          trees_change: 20,
          traffic_change: -10,
          industry_change: 2,
          population_change: 5000
        },
        expected_impact: 'Незначне покращення або стабільність'
      }
    ];
    
    res.json({
      success: true,
      count: presets.length,
      presets
    });
    
  } catch (error) {
    console.error('❌ Помилка отримання пресетів:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при отриманні готових сценаріїв'
    });
  }
};

/**
 * Отримати повну інформацію про район для моделювання
 * GET /api/scenario-modeling/district/:id
 */
exports.getDistrictFullInfo = async (req, res) => {
  try {
    const districtId = parseInt(req.params.id);
    
    // Отримати дані району
    const districtResult = await query(
      `SELECT * FROM districts WHERE id = $1`,
      [districtId]
    );
    
    if (districtResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Район не знайдено'
      });
    }
    
    const district = districtResult.rows[0];
    
    // Отримати поточну якість повітря
    const airQualityResult = await query(
      `SELECT pm25, pm10, no2, so2, co, o3, aqi, aqi_status, 
              temperature, humidity, wind_speed, measured_at
       FROM air_quality_history
       WHERE district_id = $1 AND is_forecast = false
       ORDER BY measured_at DESC
       LIMIT 1`,
      [districtId]
    );
    
    const currentAirQuality = airQualityResult.rows[0] || null;
    
    res.json({
      success: true,
      data: {
        district: {
          id: district.id,
          name: district.name,
          name_en: district.name_en,
          description: district.description,
          population: district.population,
          area_km2: parseFloat(district.area_km2),
          latitude: parseFloat(district.latitude),
          longitude: parseFloat(district.longitude)
        },
        current_parameters: {
          traffic_level: district.traffic_level,
          tree_coverage_percent: district.tree_coverage_percent,
          industrial_zones: district.industrial_zones
        },
        osm_data: district.metadata || {},
        current_air_quality: currentAirQuality ? {
          pm25: parseFloat(currentAirQuality.pm25),
          pm10: parseFloat(currentAirQuality.pm10),
          no2: parseFloat(currentAirQuality.no2),
          so2: parseFloat(currentAirQuality.so2),
          co: parseFloat(currentAirQuality.co),
          o3: parseFloat(currentAirQuality.o3),
          aqi: currentAirQuality.aqi,
          status: currentAirQuality.aqi_status,
          measured_at: currentAirQuality.measured_at
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ Помилка отримання інфо району:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при отриманні інформації про район'
    });
  }
};