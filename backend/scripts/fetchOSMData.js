// backend/scripts/fetchOSMData.js
require('dotenv').config();
const axios = require('axios');
const { query } = require('../config/database');

// Координати районів Львова (з твоєї БД)
const DISTRICTS = [
  { id: 1, name: 'Галицький', lat: 49.8403, lon: 24.0323, radius: 2000 },
  { id: 2, name: 'Франківський', lat: 49.8176, lon: 23.9888, radius: 2500 },
  { id: 3, name: 'Залізничний', lat: 49.8356, lon: 23.9305, radius: 2200 },
  { id: 4, name: 'Шевченківський', lat: 49.8662, lon: 24.0348, radius: 2300 },
  { id: 5, name: 'Личаківський', lat: 49.8193, lon: 24.0684, radius: 2800 },
  { id: 6, name: 'Сихівський', lat: 49.8107, lon: 24.0457, radius: 3000 }
];

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

/**
 * Отримати дані з OpenStreetMap через Overpass API
 */
async function fetchOSMData(district) {
  console.log(`\n📍 Збір даних для ${district.name}...`);
  
  const { lat, lon, radius } = district;
  
  // Overpass QL запит для отримання різних об'єктів
  const query = `
    [out:json][timeout:25];
    (
      // Парки і зелені зони
      way["leisure"="park"](around:${radius},${lat},${lon});
      way["landuse"="forest"](around:${radius},${lat},${lon});
      way["landuse"="grass"](around:${radius},${lat},${lon});
      relation["leisure"="park"](around:${radius},${lat},${lon});
      
      // Дороги
      way["highway"~"motorway|trunk|primary|secondary"](around:${radius},${lat},${lon});
      
      // Промислові зони
      way["landuse"="industrial"](around:${radius},${lat},${lon});
      way["man_made"="works"](around:${radius},${lat},${lon});
      
      // Житлові зони
      way["landuse"="residential"](around:${radius},${lat},${lon});
      
      // Комерційні зони
      way["landuse"="commercial"](around:${radius},${lat},${lon});
    );
    out body;
    >;
    out skel qt;
  `;
  
  try {
    const response = await axios.post(OVERPASS_API, query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Помилка запиту OSM для ${district.name}:`, error.message);
    return null;
  }
}

/**
 * Розрахувати площу полігону (спрощений алгоритм)
 */
function calculateArea(coordinates) {
  if (!coordinates || coordinates.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    area += (p1.lon * p2.lat) - (p2.lon * p1.lat);
  }
  area = Math.abs(area) / 2;
  
  // Конвертуємо в км²
  return area * 111.32 * 111.32; // приблизна конвертація градусів в км
}

/**
 * Розрахувати довжину лінії (дороги)
 */
function calculateLength(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  
  let length = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    
    const dlat = p2.lat - p1.lat;
    const dlon = p2.lon - p1.lon;
    
    // Формула гаверсинусів (спрощена)
    const dist = Math.sqrt(dlat * dlat + dlon * dlon) * 111.32;
    length += dist;
  }
  
  return length;
}

/**
 * Обробити дані OSM і витягти статистику
 */
function processOSMData(data, district) {
  if (!data || !data.elements) {
    console.log('⚠️ Немає даних');
    return null;
  }
  
  const nodes = {};
  const ways = {};
  
  // Спочатку збираємо всі nodes (точки)
  data.elements.forEach(el => {
    if (el.type === 'node') {
      nodes[el.id] = { lat: el.lat, lon: el.lon };
    }
  });
  
  // Потім збираємо ways (лінії/полігони)
  data.elements.forEach(el => {
    if (el.type === 'way') {
      ways[el.id] = {
        tags: el.tags || {},
        nodes: el.nodes || []
      };
    }
  });
  
  // Статистика
  const stats = {
    parks: { count: 0, total_area: 0 },
    forests: { count: 0, total_area: 0 },
    grass: { count: 0, total_area: 0 },
    roads: { count: 0, total_length: 0 },
    industrial: { count: 0, total_area: 0 },
    residential: { count: 0, total_area: 0 },
    commercial: { count: 0, total_area: 0 }
  };
  
  // Аналізуємо кожен way
  Object.values(ways).forEach(way => {
    const tags = way.tags;
    
    // Координати об'єкта
    const coordinates = way.nodes
      .map(nodeId => nodes[nodeId])
      .filter(n => n);
    
    if (coordinates.length === 0) return;
    
    // Парки
    if (tags.leisure === 'park') {
      stats.parks.count++;
      stats.parks.total_area += calculateArea(coordinates);
    }
    
    // Ліси
    if (tags.landuse === 'forest') {
      stats.forests.count++;
      stats.forests.total_area += calculateArea(coordinates);
    }
    
    // Трава/газони
    if (tags.landuse === 'grass') {
      stats.grass.count++;
      stats.grass.total_area += calculateArea(coordinates);
    }
    
    // Дороги
    if (tags.highway && ['motorway', 'trunk', 'primary', 'secondary'].includes(tags.highway)) {
      stats.roads.count++;
      stats.roads.total_length += calculateLength(coordinates);
    }
    
    // Промислові зони
    if (tags.landuse === 'industrial' || tags.man_made === 'works') {
      stats.industrial.count++;
      stats.industrial.total_area += calculateArea(coordinates);
    }
    
    // Житлові зони
    if (tags.landuse === 'residential') {
      stats.residential.count++;
      stats.residential.total_area += calculateArea(coordinates);
    }
    
    // Комерційні зони
    if (tags.landuse === 'commercial') {
      stats.commercial.count++;
      stats.commercial.total_area += calculateArea(coordinates);
    }
  });
  
  console.log(`\n✅ Статистика для ${district.name}:`);
  console.log(`   🌳 Парків: ${stats.parks.count}, площа: ${stats.parks.total_area.toFixed(2)} км²`);
  console.log(`   🌲 Лісів: ${stats.forests.count}, площа: ${stats.forests.total_area.toFixed(2)} км²`);
  console.log(`   🟢 Газонів: ${stats.grass.count}, площа: ${stats.grass.total_area.toFixed(2)} км²`);
  console.log(`   🚗 Доріг: ${stats.roads.count}, довжина: ${stats.roads.total_length.toFixed(2)} км`);
  console.log(`   🏭 Промзон: ${stats.industrial.count}, площа: ${stats.industrial.total_area.toFixed(2)} км²`);
  console.log(`   🏘️ Житлових зон: ${stats.residential.count}`);
  
  return stats;
}

/**
 * Конвертувати OSM статистику в параметри для БД
 */
function calculateDistrictMetrics(stats, district) {
  // Загальна зелена площа
  const green_area = stats.parks.total_area + stats.forests.total_area + stats.grass.total_area;
  
  // Площа району (приблизно, базуючись на радіусі)
  const district_area = Math.PI * Math.pow(district.radius / 1000, 2);
  
  // % покриття деревами
  const tree_coverage = Math.min(100, Math.round((green_area / district_area) * 100));
  
  // Traffic level (базуємось на довжині доріг)
  // Чим більше доріг - тим вищий traffic
  const road_density = stats.roads.total_length / district_area;
  let traffic_level = Math.min(100, Math.round(road_density * 10));
  
  // Корекція для центральних районів
  if (district.id === 1 || district.id === 2) {
    traffic_level = Math.min(100, traffic_level + 20);
  }
  
  // Кількість промзон
  const industrial_zones = stats.industrial.count;
  
  console.log(`\n📊 Розраховані метрики:`);
  console.log(`   Площа району: ${district_area.toFixed(2)} км²`);
  console.log(`   Зелена зона: ${green_area.toFixed(2)} км² (${tree_coverage}%)`);
  console.log(`   Щільність доріг: ${road_density.toFixed(2)} км/км²`);
  console.log(`   Traffic level: ${traffic_level}`);
  console.log(`   Промзон: ${industrial_zones}`);
  
  return {
    tree_coverage_percent: tree_coverage,
    traffic_level: traffic_level,
    industrial_zones: industrial_zones,
    area_km2: parseFloat(district_area.toFixed(2)),
    osm_data: {
      green_area_km2: parseFloat(green_area.toFixed(2)),
      roads_length_km: parseFloat(stats.roads.total_length.toFixed(2)),
      parks_count: stats.parks.count,
      forests_count: stats.forests.count,
      residential_zones: stats.residential.count,
      commercial_zones: stats.commercial.count,
      updated_at: new Date().toISOString()
    }
  };
}

/**
 * Оновити дані району в БД
 */
async function updateDistrictInDB(districtId, metrics) {
  try {
    await query(
      `UPDATE districts 
       SET 
         tree_coverage_percent = $1,
         traffic_level = $2,
         industrial_zones = $3,
         area_km2 = $4,
         metadata = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        metrics.tree_coverage_percent,
        metrics.traffic_level,
        metrics.industrial_zones,
        metrics.area_km2,
        JSON.stringify(metrics.osm_data),
        districtId
      ]
    );
    
    console.log(`✅ Дані оновлено в БД для району ${districtId}`);
  } catch (error) {
    console.error(`❌ Помилка оновлення БД:`, error.message);
  }
}

/**
 * Основна функція
 */
async function main() {
  console.log('🗺️ ЗБІР ДАНИХ З OPENSTREETMAP\n');
  console.log('=' .repeat(70));
  
  for (const district of DISTRICTS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📍 РАЙОН: ${district.name.toUpperCase()}`);
    console.log('='.repeat(70));
    
    // 1. Отримати дані з OSM
    const osmData = await fetchOSMData(district);
    
    if (!osmData) {
      console.log(`⚠️ Пропускаємо ${district.name}`);
      continue;
    }
    
    // 2. Обробити дані
    const stats = processOSMData(osmData, district);
    
    if (!stats) {
      console.log(`⚠️ Не вдалося обробити дані для ${district.name}`);
      continue;
    }
    
    // 3. Розрахувати метрики
    const metrics = calculateDistrictMetrics(stats, district);
    
    // 4. Оновити БД
    await updateDistrictInDB(district.id, metrics);
    
    // Пауза між запитами (щоб не перевантажити OSM API)
    console.log('\n⏳ Пауза 2 секунди...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ ЗАВЕРШЕНО! Всі райони оновлено');
  console.log('='.repeat(70));
  
  process.exit(0);
}

// Запуск
main().catch(error => {
  console.error('❌ Критична помилка:', error);
  process.exit(1);
});