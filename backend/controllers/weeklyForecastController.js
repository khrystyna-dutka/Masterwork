// backend/controllers/weeklyForecastController.js
const { query } = require('../config/database');

/**
 * Отримати тижневий прогноз (3 минулих + сьогодні + 3 майбутніх)
 * GET /api/forecast/weekly/:districtId
 */
exports.getWeeklyForecast = async (req, res) => {
  try {
    const { districtId } = req.params;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 ТИЖНЕВИЙ ПРОГНОЗ для району ${districtId}`);
    console.log(`${'='.repeat(60)}\n`);

    // 1️⃣ Отримати середнє AQI за останні 3 дні (по добах)
    const pastDaysQuery = `
      SELECT 
        DATE(measured_at AT TIME ZONE 'Europe/Kiev') as date,
        ROUND(AVG(aqi))::integer as avg_aqi
      FROM air_quality_history
      WHERE district_id = $1 
        AND is_forecast = false
        AND measured_at >= NOW() - INTERVAL '4 days'
        AND measured_at < DATE_TRUNC('day', NOW())
      GROUP BY DATE(measured_at AT TIME ZONE 'Europe/Kiev')
      ORDER BY date ASC
      LIMIT 3
    `;

    const pastDaysResult = await query(pastDaysQuery, [districtId]);
    console.log(`📊 Минулі дні знайдено: ${pastDaysResult.rows.length}`);
    pastDaysResult.rows.forEach(row => {
      console.log(`   ${row.date}: AQI = ${row.avg_aqi}`);
    });

    // 2️⃣ Отримати середнє AQI за сьогодні
    const todayQuery = `
      SELECT ROUND(AVG(aqi))::integer as avg_aqi
      FROM air_quality_history
      WHERE district_id = $1 
        AND is_forecast = false
        AND measured_at >= DATE_TRUNC('day', NOW())
        AND measured_at < NOW()
    `;

    const todayResult = await query(todayQuery, [districtId]);
    const todayAQI = todayResult.rows[0]?.avg_aqi || null;
    
    console.log(`📍 Сьогодні: AQI = ${todayAQI || 'немає даних'}`);

    // 3️⃣ Якщо немає даних за сьогодні - взяти останнє значення
    let currentAQI = todayAQI;
    if (!currentAQI) {
      const lastQuery = `
        SELECT aqi
        FROM air_quality_history
        WHERE district_id = $1 AND is_forecast = false
        ORDER BY measured_at DESC
        LIMIT 1
      `;
      const lastResult = await query(lastQuery, [districtId]);
      currentAQI = lastResult.rows[0]?.aqi || 50;
      console.log(`⚠️ Використано останнє значення: ${currentAQI}`);
    }

    // 4️⃣ Генеруємо майбутні дні (простий прогноз на основі поточного)
    const futureDays = [];
    const today = new Date();
    
    // Беремо тренд з минулих днів
    let trend = 0;
    if (pastDaysResult.rows.length >= 2) {
      const lastDay = pastDaysResult.rows[pastDaysResult.rows.length - 1].avg_aqi;
      const prevDay = pastDaysResult.rows[pastDaysResult.rows.length - 2].avg_aqi;
      trend = (currentAQI - lastDay) / 2; // Половина різниці
    }

    console.log(`📈 Тренд: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}`);
    console.log(`\n🔮 Прогноз майбутніх днів:`);

    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);
      
      // Прогноз: поточне значення + тренд з поступовим затуханням
      const decay = 1 - (i * 0.2); // Затухання тренду
      const forecastAQI = Math.round(currentAQI + (trend * i * decay));
      
      // Обмежуємо розумними межами
      const boundedAQI = Math.max(10, Math.min(150, forecastAQI));
      
      futureDays.push({
        date: futureDate.toISOString().split('T')[0],
        avg_aqi: boundedAQI
      });

      console.log(`   День +${i}: ${futureDate.toISOString().split('T')[0]} = ${boundedAQI}`);
    }

    // 5️⃣ Формуємо timeline
    const timeline = [];

    // Додаємо минулі дні
    pastDaysResult.rows.forEach(row => {
      timeline.push({
        date: row.date,
        aqi: parseInt(row.avg_aqi),
        isPast: true,
        isCurrent: false,
        isFuture: false
      });
    });

    // Додаємо сьогодні
    timeline.push({
      date: today.toISOString().split('T')[0],
      aqi: parseInt(currentAQI),
      isPast: false,
      isCurrent: true,
      isFuture: false
    });

    // Додаємо майбутні дні
    futureDays.forEach(day => {
      timeline.push({
        date: day.date,
        aqi: day.avg_aqi,
        isPast: false,
        isCurrent: false,
        isFuture: true
      });
    });

    console.log(`\n✅ Тижневий прогноз сформовано: ${timeline.length} днів`);
    console.log(`${'='.repeat(60)}\n`);

    res.json({
      success: true,
      district_id: parseInt(districtId),
      timeline
    });

  } catch (error) {
    console.error('❌ Помилка формування тижневого прогнозу:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при формуванні прогнозу',
      error: error.message
    });
  }
};