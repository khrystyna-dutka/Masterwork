// controllers/subscriptionsController.js
const { query } = require('../config/database');
const { sendDailyEmail } = require('../services/emailService');

// @desc    Отримати підписки користувача
// @route   GET /api/subscriptions
// @access  Private
const getUserSubscriptions = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        us.id,
        us.district_id,
        us.alert_threshold,
        us.notify_daily_summary,
        us.notify_on_high_pollution,
        us.notify_on_forecast,
        d.name as district_name,
        d.latitude,
        d.longitude
       FROM user_subscriptions us
       JOIN districts d ON us.district_id = d.id
       WHERE us.user_id = $1
       ORDER BY d.name`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        subscriptions: result.rows
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при отриманні підписок',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Оновити підписки користувача
// @route   PUT /api/subscriptions
// @access  Private
const updateUserSubscriptions = async (req, res) => {
  try {
    const { district_ids, alert_threshold, notify_daily_summary, notify_on_high_pollution, send_test_email } = req.body;
    const userId = req.user.id;

    console.log('📝 Оновлення підписок для користувача:', userId);
    console.log('📋 Обрані райони:', district_ids);

    // Перевірка чи district_ids є масивом
    if (!Array.isArray(district_ids)) {
      return res.status(400).json({
        success: false,
        message: 'district_ids повинен бути масивом'
      });
    }

    // Видаляємо всі існуючі підписки користувача
    await query('DELETE FROM user_subscriptions WHERE user_id = $1', [userId]);

    // Додаємо нові підписки
    if (district_ids.length > 0) {
      const values = district_ids.map((districtId, index) => 
        `($1, $${index + 2}, $${district_ids.length + 2}, $${district_ids.length + 3}, $${district_ids.length + 4})`
      ).join(', ');

      const params = [
        userId,
        ...district_ids,
        alert_threshold || 100,
        notify_daily_summary !== undefined ? notify_daily_summary : true,
        notify_on_high_pollution !== undefined ? notify_on_high_pollution : true
      ];

      await query(
        `INSERT INTO user_subscriptions 
         (user_id, district_id, alert_threshold, notify_daily_summary, notify_on_high_pollution)
         VALUES ${values}`,
        params
      );
    }

    // Отримуємо оновлені підписки з назвами районів
    const result = await query(
      `SELECT 
        us.id,
        us.district_id,
        us.alert_threshold,
        us.notify_daily_summary,
        us.notify_on_high_pollution,
        d.name as district_name
       FROM user_subscriptions us
       JOIN districts d ON us.district_id = d.id
       WHERE us.user_id = $1
       ORDER BY d.name`,
      [userId]
    );

    console.log('✅ Підписки оновлено:', result.rows);

    // Якщо вибрані райони і увімкнені email сповіщення - відправляємо тестовий email
    let emailSent = false;
    if (district_ids.length > 0 && send_test_email !== false) {
      try {
        console.log('📧 Підготовка до відправки тестового email...');

        // Отримуємо дані користувача
        const userResult = await query(
          'SELECT email, full_name, notification_preferences FROM users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          console.log('👤 Користувач:', user.email, user.full_name);
          
          // Перевіряємо чи увімкнені email сповіщення
          if (user.notification_preferences && user.notification_preferences.email) {
            // Отримуємо дані про якість повітря для вибраних районів
            const districtsWithData = [];
            
            for (const subscription of result.rows) {
              console.log(`🔍 Шукаємо дані для району: ${subscription.district_name} (ID: ${subscription.district_id})`);

              const airQualityResult = await query(`
                SELECT 
                  aqh.aqi,
                  aqh.pm25,
                  aqh.pm10,
                  aqh.no2,
                  aqh.so2,
                  aqh.co,
                  aqh.o3,
                  aqh.temperature,
                  aqh.humidity,
                  aqh.measured_at,
                  d.name as district_name
                FROM air_quality_history aqh
                JOIN districts d ON aqh.district_id = d.id
                WHERE aqh.district_id = $1
                  AND aqh.is_forecast = false
                ORDER BY aqh.measured_at DESC
                LIMIT 1
              `, [subscription.district_id]);

              if (airQualityResult.rows.length > 0) {
                const airData = airQualityResult.rows[0];
                console.log(`✅ Знайдено дані:`, {
                  district: airData.district_name,
                  aqi: airData.aqi,
                  temperature: airData.temperature,
                  measured_at: airData.measured_at
                });

                // Безпечне форматування даних
                const districtData = {
                  name: airData.district_name || subscription.district_name,
                  aqi: airData.aqi || 50,
                  pm25: airData.pm25 ? parseFloat(airData.pm25).toFixed(2) : '12.0',
                  pm10: airData.pm10 ? parseFloat(airData.pm10).toFixed(2) : '20.0',
                  no2: airData.no2 ? parseFloat(airData.no2).toFixed(2) : '15.0',
                  so2: airData.so2 ? parseFloat(airData.so2).toFixed(2) : '10.0',
                  co: airData.co ? parseFloat(airData.co).toFixed(2) : '0.5',
                  o3: airData.o3 ? parseFloat(airData.o3).toFixed(2) : '30.0',
                  temperature: airData.temperature ? parseFloat(airData.temperature).toFixed(1) : '18.0',
                  humidity: airData.humidity || 65
                };

                console.log(`📊 Форматовані дані:`, districtData);
                districtsWithData.push(districtData);
              } else {
                // Якщо немає даних, додаємо район з мок-даними
                console.log(`⚠️ Немає даних про якість повітря для району ${subscription.district_name}, використовуємо мок-дані`);
                districtsWithData.push({
                  name: subscription.district_name,
                  aqi: 50,
                  pm25: '12.0',
                  pm10: '20.3',
                  no2: '15.2',
                  so2: '10.1',
                  co: '0.5',
                  o3: '30.5',
                  temperature: '18.5',
                  humidity: 65
                });
              }
            }

            console.log(`📧 Відправка тестового email для ${user.email}...`);
            console.log(`📋 Дані для відправки (${districtsWithData.length} районів):`, districtsWithData);

            // Відправляємо тестовий email
            const emailResult = await sendDailyEmail(
              user.email,
              user.full_name,
              districtsWithData
            );

            emailSent = emailResult.success;
            
            if (emailSent) {
              console.log(`✅ Тестовий email успішно відправлено для ${user.email}`);
            } else {
              console.log(`❌ Не вдалося відправити тестовий email для ${user.email}`);
            }
          } else {
            console.log(`⚠️ Email сповіщення вимкнені для користувача ${user.email}`);
          }
        }
      } catch (emailError) {
        console.error('❌ Помилка відправки тестового email:', emailError);
        // Не блокуємо відповідь якщо email не відправився
      }
    }

    res.json({
      success: true,
      message: 'Підписки успішно оновлено',
      emailSent: emailSent,
      data: {
        subscriptions: result.rows
      }
    });
  } catch (error) {
    console.error('❌ Update subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при оновленні підписок',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Додати підписку на район
// @route   POST /api/subscriptions/:districtId
// @access  Private
const addSubscription = async (req, res) => {
  try {
    const { districtId } = req.params;
    const userId = req.user.id;
    const { alert_threshold, notify_daily_summary, notify_on_high_pollution } = req.body;

    console.log(`➕ Додавання підписки на район ${districtId} для користувача ${userId}`);

    // Перевірка чи район існує
    const districtCheck = await query('SELECT id, name FROM districts WHERE id = $1', [districtId]);
    
    if (districtCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Район не знайдено'
      });
    }

    // Перевірка чи підписка вже існує
    const existingSubscription = await query(
      'SELECT id FROM user_subscriptions WHERE user_id = $1 AND district_id = $2',
      [userId, districtId]
    );

    if (existingSubscription.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Підписка на цей район вже існує'
      });
    }

    // Створення підписки
    const result = await query(
      `INSERT INTO user_subscriptions 
       (user_id, district_id, alert_threshold, notify_daily_summary, notify_on_high_pollution)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        districtId,
        alert_threshold || 100,
        notify_daily_summary !== undefined ? notify_daily_summary : true,
        notify_on_high_pollution !== undefined ? notify_on_high_pollution : true
      ]
    );

    console.log(`✅ Підписку додано:`, result.rows[0]);

    res.status(201).json({
      success: true,
      message: `Підписку на район ${districtCheck.rows[0].name} успішно додано`,
      data: {
        subscription: result.rows[0]
      }
    });
  } catch (error) {
    console.error('❌ Add subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при додаванні підписки',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Видалити підписку
// @route   DELETE /api/subscriptions/:districtId
// @access  Private
const deleteSubscription = async (req, res) => {
  try {
    const { districtId } = req.params;
    const userId = req.user.id;

    console.log(`🗑️ Видалення підписки на район ${districtId} для користувача ${userId}`);

    const result = await query(
      'DELETE FROM user_subscriptions WHERE user_id = $1 AND district_id = $2 RETURNING *',
      [userId, districtId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Підписку не знайдено'
      });
    }

    console.log(`✅ Підписку видалено:`, result.rows[0]);

    res.json({
      success: true,
      message: 'Підписку успішно видалено'
    });
  } catch (error) {
    console.error('❌ Delete subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Помилка при видаленні підписки',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUserSubscriptions,
  updateUserSubscriptions,
  addSubscription,
  deleteSubscription
};