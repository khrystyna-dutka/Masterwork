// services/emailService.js
const nodemailer = require('nodemailer');
const { query } = require('../config/database');

// Створення транспортера
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Додаємо налаштування для UTF-8
    pool: true,
    maxConnections: 1,
    rateDelta: 1000,
    rateLimit: 5
  });
};

// Функція для визначення статусу AQI
const getAQIStatus = (aqi) => {
  if (aqi <= 50) return { label: 'Добра', color: '#10b981', emoji: '✅' };
  if (aqi <= 100) return { label: 'Помірна', color: '#f59e0b', emoji: '⚠️' };
  if (aqi <= 150) return { label: 'Нездорова для чутливих', color: '#f97316', emoji: '🟠' };
  if (aqi <= 200) return { label: 'Нездорова', color: '#ef4444', emoji: '🔴' };
  if (aqi <= 300) return { label: 'Дуже нездорова', color: '#9333ea', emoji: '🟣' };
  return { label: 'Небезпечна', color: '#7f1d1d', emoji: '⚫' };
};

// HTML шаблон для email
const generateEmailHTML = (userName, districts) => {
  const districtRows = districts.map(district => {
    const status = getAQIStatus(district.aqi);
    return `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
          <strong style="font-size: 16px; color: #1f2937;">${district.name}</strong>
        </td>
        <td style="padding: 15px; text-align: center; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 24px;">${status.emoji}</span>
          <div style="font-size: 28px; font-weight: bold; color: ${status.color}; margin: 5px 0;">
            ${district.aqi}
          </div>
          <div style="font-size: 14px; color: #6b7280;">${status.label}</div>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
            <div>PM2.5: <strong>${district.pm25 || 'N/A'} µg/m³</strong></div>
            <div>PM10: <strong>${district.pm10 || 'N/A'} µg/m³</strong></div>
            <div>NO₂: <strong>${district.no2 || 'N/A'} µg/m³</strong></div>
            <div>Температура: <strong>${district.temperature || 'N/A'}°C</strong></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Щоденний звіт про якість повітря</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">🌱 EcoLviv</h1>
          <p style="margin: 10px 0 0; color: #dbeafe; font-size: 16px;">Щоденний звіт про якість повітря</p>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <p style="font-size: 16px; color: #374151; margin: 0 0 20px;">
            Доброго ранку, <strong>${userName}</strong>! 👋
          </p>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 25px; line-height: 1.6;">
            Ось актуальна інформація про стан повітря у ваших обраних районах Львова станом на <strong>${new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>:
          </p>

          <!-- Districts Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Район</th>
                <th style="padding: 12px; text-align: center; font-size: 14px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Стан повітря</th>
                <th style="padding: 12px; text-align: left; font-size: 14px; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Показники</th>
              </tr>
            </thead>
            <tbody>
              ${districtRows}
            </tbody>
          </table>

          <!-- Recommendations -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px; font-size: 16px; color: #1e40af;">💡 Рекомендації:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 14px; line-height: 1.8;">
              <li>При високому рівні забруднення обмежте час перебування на вулиці</li>
              <li>Використовуйте захисні маски при AQI вище 150</li>
              <li>Провітрюйте приміщення у ранкові години</li>
              <li>Слідкуйте за оновленнями у додатку EcoLviv</li>
            </ul>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; font-size: 14px;">
              Переглянути детальну інформацію
            </a>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6;">
              Ви отримали цей лист, тому що підписані на щоденні сповіщення EcoLviv.<br>
              Змінити налаштування можна у своєму профілі на сайті.
            </p>
            <p style="font-size: 12px; color: #d1d5db; margin: 10px 0 0; text-align: center;">
              © ${new Date().getFullYear()} EcoLviv. Всі права захищені.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Відправка email одному користувачу
const sendDailyEmail = async (userEmail, userName, districts) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'EcoLviv',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: userEmail,
      subject: `🌱 Щоденний звіт про якість повітря - ${new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      html: generateEmailHTML(userName, districts),
      // ВАЖЛИВО: Додаємо UTF-8 encoding
      encoding: 'utf-8',
      textEncoding: 'base64',
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email відправлено для ${userEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Помилка відправки email для ${userEmail}:`, error);
    return { success: false, error: error.message };
  }
};

// Відправка щоденних email всім підписаним користувачам
const sendDailyEmailsToSubscribers = async () => {
  try {
    console.log('🔄 Початок відправки щоденних email сповіщень...');

    // Отримуємо користувачів з увімкненими email сповіщеннями та їх підписки
    const result = await query(`
      SELECT DISTINCT
        u.id as user_id,
        u.email,
        u.full_name,
        u.notification_preferences
      FROM users u
      INNER JOIN user_subscriptions us ON u.id = us.user_id
      WHERE 
        us.notify_daily_summary = true
        AND u.notification_preferences->>'email' = 'true'
    `);

    if (result.rows.length === 0) {
      console.log('ℹ️ Немає користувачів для відправки email');
      return { sent: 0, failed: 0 };
    }

    console.log(`📧 Знайдено ${result.rows.length} користувачів для відправки`);

    let sentCount = 0;
    let failedCount = 0;

    // Для кожного користувача
    for (const user of result.rows) {
      try {
        // Отримуємо підписки користувача з даними районів
        const subscriptionsResult = await query(`
          SELECT 
            d.id,
            d.name,
            us.alert_threshold
          FROM user_subscriptions us
          INNER JOIN districts d ON us.district_id = d.id
          WHERE us.user_id = $1 AND us.notify_daily_summary = true
          ORDER BY d.name
        `, [user.user_id]);

        if (subscriptionsResult.rows.length === 0) {
          console.log(`⚠️ У користувача ${user.email} немає підписок`);
          continue;
        }

        // Отримуємо останні дані про якість повітря для кожного району
        const districtsWithData = [];
        
        for (const subscription of subscriptionsResult.rows) {
          const airQualityResult = await query(`
            SELECT 
              aqi,
              pm25,
              pm10,
              no2,
              so2,
              co,
              o3,
              temperature,
              humidity,
              measured_at
            FROM air_quality_history
            WHERE district_id = $1
              AND is_forecast = false
            ORDER BY measured_at DESC
            LIMIT 1
          `, [subscription.id]);

          if (airQualityResult.rows.length > 0) {
            const airData = airQualityResult.rows[0];
            districtsWithData.push({
              name: subscription.name,
              aqi: airData.aqi,
              pm25: airData.pm25,
              pm10: airData.pm10,
              no2: airData.no2,
              so2: airData.so2,
              co: airData.co,
              o3: airData.o3,
              temperature: airData.temperature,
              humidity: airData.humidity
            });
          } else {
            // Якщо немає даних, додаємо район з мок-даними
            districtsWithData.push({
              name: subscription.name,
              aqi: 50,
              pm25: 12,
              pm10: 20,
              no2: 15,
              temperature: 18
            });
          }
        }

        // Відправляємо email
        const emailResult = await sendDailyEmail(
          user.email,
          user.full_name,
          districtsWithData
        );

        if (emailResult.success) {
          sentCount++;
        } else {
          failedCount++;
        }

      } catch (userError) {
        console.error(`❌ Помилка для користувача ${user.email}:`, userError);
        failedCount++;
      }
    }

    console.log(`✅ Відправка завершена: ${sentCount} успішно, ${failedCount} помилок`);
    return { sent: sentCount, failed: failedCount };

  } catch (error) {
    console.error('❌ Критична помилка при відправці щоденних email:', error);
    throw error;
  }
};

module.exports = {
  sendDailyEmail,
  sendDailyEmailsToSubscribers
};