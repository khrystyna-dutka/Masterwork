// src/utils/helpers.js

/**
 * Визначення статусу якості повітря за значенням AQI
 */
export const getAQIStatus = (aqi) => {
  if (aqi <= 50) {
    return { 
      color: '#10b981', 
      text: 'Добра', 
      textColor: 'text-green-600',
      bgColor: 'bg-green-100'
    };
  }
  if (aqi <= 70) {
    return { 
      color: '#84cc16', 
      text: 'Помірна', 
      textColor: 'text-lime-600',
      bgColor: 'bg-lime-100'
    };
  }
  if (aqi <= 90) {
    return { 
      color: '#eab308', 
      text: 'Задовільна', 
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    };
  }
  if (aqi <= 110) {
    return { 
      color: '#f97316', 
      text: 'Погана', 
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-100'
    };
  }
  return { 
    color: '#ef4444', 
    text: 'Дуже погана', 
    textColor: 'text-red-600',
    bgColor: 'bg-red-100'
  };
};

/**
 * Розрахунок AQI з урахуванням сценарію
 */
export const calculateScenarioAQI = (district, trafficLevel, treeLevel) => {
  const trafficImpact = (trafficLevel / 100) * district.traffic * 0.6;
  const treeImpact = (treeLevel / 100) * district.trees * 0.4;
  const scenarioAQI = district.baseAQI + trafficImpact - treeImpact;
  return Math.max(0, Math.min(150, scenarioAQI));
};

/**
 * Генерація прогнозу якості повітря
 */
export const generateForecast = (district, hours, currentAQI) => {
  const forecast = [];
  
  for (let i = 0; i <= hours; i++) {
    const hour = new Date().getHours() + i;
    const hourMod = hour % 24;
    
    // Імітація денного циклу
    let cycleFactor = 1;
    if (hourMod >= 7 && hourMod <= 9) cycleFactor = 1.2; // Ранковий пік
    if (hourMod >= 17 && hourMod <= 19) cycleFactor = 1.25; // Вечірній пік
    if (hourMod >= 23 || hourMod <= 5) cycleFactor = 0.8; // Ніч
    
    const variation = (Math.random() - 0.5) * 5;
    const aqi = currentAQI * cycleFactor + variation;
    
    forecast.push({
      hour: `${hourMod}:00`,
      aqi: Math.round(aqi),
      pm25: Math.round(district.pm25 * cycleFactor + variation * 0.5),
      no2: Math.round(district.no2 * cycleFactor + variation * 0.3)
    });
  }
  
  return forecast;
};

/**
 * Форматування числа населення (115000 -> 115k)
 */
export const formatPopulation = (population) => {
  return `${(population / 1000).toFixed(0)}k`;
};