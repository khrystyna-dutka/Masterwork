// backend/scripts/fixDistricts.js
require('dotenv').config();
const { query, pool } = require('../config/database');

async function fixDistricts() {
  try {
    console.log('🔄 Початок виправлення районів...');

    // Встановлюємо UTF-8
    await query('SET CLIENT_ENCODING TO UTF8');
    console.log('✅ Встановлено UTF-8 encoding');

    // Видаляємо старі райони
    await query('DELETE FROM districts');
    console.log('✅ Старі райони видалено');

    // Додаємо райони з правильним кодуванням
    const districts = [
      {
        name: 'Галицький',
        name_en: 'Halytskyi',
        lat: 49.8403,
        lng: 24.0323,
        population: 115000,
        tree_coverage: 40,
        traffic_level: 82,
        description: 'Історичний центр міста з високою туристичною активністю'
      },
      {
        name: 'Франківський',
        name_en: 'Frankivskyi',
        lat: 49.8176,
        lng: 23.9888,
        population: 142000,
        tree_coverage: 35,
        traffic_level: 88,
        description: 'Промисловий район з високим рівнем транспортного навантаження'
      },
      {
        name: 'Залізничний',
        name_en: 'Zaliznychnyi',
        lat: 49.8356,
        lng: 23.9305,
        population: 108000,
        tree_coverage: 25,
        traffic_level: 95,
        description: 'Транспортний вузол міста з залізничним вокзалом'
      },
      {
        name: 'Шевченківський',
        name_en: 'Shevchenkivskyi',
        lat: 49.8662,
        lng: 24.0348,
        population: 98000,
        tree_coverage: 20,
        traffic_level: 98,
        description: 'Район з інтенсивним дорожнім рухом'
      },
      {
        name: 'Личаківський',
        name_en: 'Lychakivskyi',
        lat: 49.8193,
        lng: 24.0684,
        population: 135000,
        tree_coverage: 45,
        traffic_level: 85,
        description: 'Зелений район з парками та лісопарками'
      },
      {
        name: 'Сихівський',
        name_en: 'Sykhivskyi',
        lat: 49.8107,
        lng: 24.0457,
        population: 125000,
        tree_coverage: 55,
        traffic_level: 70,
        description: 'Найбільш екологічно чистий спальний район'
      }
    ];

    for (const district of districts) {
      const result = await query(
        `INSERT INTO districts 
         (name, name_en, latitude, longitude, population, tree_coverage_percent, traffic_level, description) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name`,
        [
          district.name,
          district.name_en,
          district.lat,
          district.lng,
          district.population,
          district.tree_coverage,
          district.traffic_level,
          district.description
        ]
      );

      console.log(`✅ Додано район: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }

    // Перевіряємо результат
    const checkResult = await query('SELECT id, name, name_en FROM districts ORDER BY id');
    console.log('\n📋 Всі райони в БД:');
    checkResult.rows.forEach(row => {
      console.log(`   ID: ${row.id} | ${row.name} (${row.name_en})`);
    });

    console.log('\n✅ Райони успішно виправлено!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixDistricts();