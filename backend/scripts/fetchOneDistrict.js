// backend/scripts/fetchOneDistrict.js
require('dotenv').config();
const axios = require('axios');
const { query } = require('../config/database');

const DISTRICT = { 
  id: 4, 
  name: 'Шевченківський', 
  lat: 49.8662, 
  lon: 24.0348, 
  radius: 2300 
};

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

async function fetchOSMData(district) {
  console.log(`\n📍 Збір даних для ${district.name}...`);
  
  const { lat, lon, radius } = district;
  
  // Зменшимо радіус для швидшого запиту
  const smallerRadius = radius - 300;
  
  const osmQuery = `
    [out:json][timeout:60];
    (
      way["leisure"="park"](around:${smallerRadius},${lat},${lon});
      way["landuse"="forest"](around:${smallerRadius},${lat},${lon});
      way["landuse"="grass"](around:${smallerRadius},${lat},${lon});
      way["highway"~"motorway|trunk|primary|secondary"](around:${smallerRadius},${lat},${lon});
      way["landuse"="industrial"](around:${smallerRadius},${lat},${lon});
      way["landuse"="residential"](around:${smallerRadius},${lat},${lon});
    );
    out body;
    >;
    out skel qt;
  `;
  
  try {
    const response = await axios.post(OVERPASS_API, osmQuery, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 60000 // 60 секунд
    });
    
    return response.data;
  } catch (error) {
    console.error(`❌ Помилка:`, error.message);
    return null;
  }
}

function calculateArea(coordinates) {
  if (!coordinates || coordinates.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    area += (p1.lon * p2.lat) - (p2.lon * p1.lat);
  }
  area = Math.abs(area) / 2;
  return area * 111.32 * 111.32;
}

function calculateLength(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0;
  let length = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const dlat = p2.lat - p1.lat;
    const dlon = p2.lon - p1.lon;
    const dist = Math.sqrt(dlat * dlat + dlon * dlon) * 111.32;
    length += dist;
  }
  return length;
}

function processOSMData(data, district) {
  if (!data || !data.elements) return null;
  
  const nodes = {};
  const ways = {};
  
  data.elements.forEach(el => {
    if (el.type === 'node') {
      nodes[el.id] = { lat: el.lat, lon: el.lon };
    }
  });
  
  data.elements.forEach(el => {
    if (el.type === 'way') {
      ways[el.id] = {
        tags: el.tags || {},
        nodes: el.nodes || []
      };
    }
  });
  
  const stats = {
    parks: { count: 0, total_area: 0 },
    forests: { count: 0, total_area: 0 },
    grass: { count: 0, total_area: 0 },
    roads: { count: 0, total_length: 0 },
    industrial: { count: 0, total_area: 0 },
    residential: { count: 0, total_area: 0 }
  };
  
  Object.values(ways).forEach(way => {
    const tags = way.tags;
    const coordinates = way.nodes.map(nodeId => nodes[nodeId]).filter(n => n);
    
    if (coordinates.length === 0) return;
    
    if (tags.leisure === 'park') {
      stats.parks.count++;
      stats.parks.total_area += calculateArea(coordinates);
    }
    if (tags.landuse === 'forest') {
      stats.forests.count++;
      stats.forests.total_area += calculateArea(coordinates);
    }
    if (tags.landuse === 'grass') {
      stats.grass.count++;
      stats.grass.total_area += calculateArea(coordinates);
    }
    if (tags.highway && ['motorway', 'trunk', 'primary', 'secondary'].includes(tags.highway)) {
      stats.roads.count++;
      stats.roads.total_length += calculateLength(coordinates);
    }
    if (tags.landuse === 'industrial' || tags.man_made === 'works') {
      stats.industrial.count++;
      stats.industrial.total_area += calculateArea(coordinates);
    }
    if (tags.landuse === 'residential') {
      stats.residential.count++;
      stats.residential.total_area += calculateArea(coordinates);
    }
  });
  
  console.log(`\n✅ Статистика:`);
  console.log(`   🌳 Парків: ${stats.parks.count}, площа: ${stats.parks.total_area.toFixed(2)} км²`);
  console.log(`   🌲 Лісів: ${stats.forests.count}`);
  console.log(`   🟢 Газонів: ${stats.grass.count}`);
  console.log(`   🚗 Доріг: ${stats.roads.count}, довжина: ${stats.roads.total_length.toFixed(2)} км`);
  console.log(`   🏭 Промзон: ${stats.industrial.count}`);
  
  return stats;
}

function calculateDistrictMetrics(stats, district) {
  const green_area = stats.parks.total_area + stats.forests.total_area + stats.grass.total_area;
  const district_area = Math.PI * Math.pow(district.radius / 1000, 2);
  const tree_coverage = Math.min(100, Math.round((green_area / district_area) * 100));
  const road_density = stats.roads.total_length / district_area;
  let traffic_level = Math.min(100, Math.round(road_density * 10));
  
  // Шевченківський - один з найбільш завантажених
  traffic_level = Math.min(100, traffic_level + 25);
  
  const industrial_zones = stats.industrial.count;
  
  console.log(`\n📊 Метрики:`);
  console.log(`   Зелена зона: ${tree_coverage}%`);
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
      updated_at: new Date().toISOString()
    }
  };
}

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
    console.log(`✅ Дані оновлено в БД`);
  } catch (error) {
    console.error(`❌ Помилка БД:`, error.message);
  }
}

async function main() {
  console.log('🗺️ Завантаження даних для Шевченківського...\n');
  
  const osmData = await fetchOSMData(DISTRICT);
  
  if (!osmData) {
    console.log('❌ Не вдалося отримати дані');
    process.exit(1);
  }
  
  const stats = processOSMData(osmData, DISTRICT);
  if (!stats) {
    console.log('❌ Не вдалося обробити дані');
    process.exit(1);
  }
  
  const metrics = calculateDistrictMetrics(stats, DISTRICT);
  await updateDistrictInDB(DISTRICT.id, metrics);
  
  console.log('\n✅ ГОТОВО!');
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Помилка:', error);
  process.exit(1);
}); 