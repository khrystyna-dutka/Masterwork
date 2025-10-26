// services/cronJobs.js
const cron = require('node-cron');
const { sendDailyEmailsToSubscribers } = require('./emailService');

// Запуск щоденних email сповіщень
const startDailyEmailCron = () => {
  // Час з .env або за замовчуванням 08:00
  const cronTime = process.env.DAILY_EMAIL_TIME || '08:00';
  const [hour, minute] = cronTime.split(':');

  // Запускаємо щодня о вказаний час
  // Формат: хвилина година * * *
  const cronExpression = `${minute} ${hour} * * *`;

  console.log(`⏰ Налаштовано щоденну розсилку на ${cronTime}`);

  const job = cron.schedule(cronExpression, async () => {
    console.log(`📧 Запуск щоденної розсилки о ${new Date().toLocaleString('uk-UA')}`);
    try {
      const result = await sendDailyEmailsToSubscribers();
      console.log(`✅ Розсилка завершена: відправлено ${result.sent}, помилок ${result.failed}`);
    } catch (error) {
      console.error('❌ Помилка при щоденній розсилці:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Kiev"
  });

  job.start();
  console.log('✅ Cron job для щоденних email запущено');

  return job;
};

// Тестова відправка (можна викликати вручну)
const triggerTestEmail = async () => {
  console.log('🧪 Тестова відправка email...');
  try {
    const result = await sendDailyEmailsToSubscribers();
    console.log('✅ Тестова відправка завершена:', result);
    return result;
  } catch (error) {
    console.error('❌ Помилка тестової відправки:', error);
    throw error;
  }
};

module.exports = {
  startDailyEmailCron,
  triggerTestEmail
};