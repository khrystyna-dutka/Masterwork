# 🚀 Інструкція по запуску EcoLviv Backend

## ✅ Що вже зроблено

### 1. Ініціалізація проекту
- ✅ Створено Node.js проект
- ✅ Встановлено всі необхідні залежності
- ✅ Налаштовано структуру папок

### 2. Встановлені пакети

**Production залежності:**
- `express` - Web framework
- `cors` - Підтримка CORS
- `dotenv` - Змінні середовища
- `helmet` - Безпека HTTP заголовків
- `morgan` - HTTP логування
- `express-validator` - Валідація даних
- `bcryptjs` - Хешування паролів
- `jsonwebtoken` - JWT автентифікація

**Development залежності:**
- `nodemon` - Автоматичний перезапуск сервера

### 3. Структура проекту

```
backend/
├── config/
│   └── config.js          # Центральна конфігурація
├── middleware/
│   ├── errorHandler.js    # Обробка помилок
│   └── logger.js          # Логування запитів
├── utils/
│   └── helpers.js         # Допоміжні функції
├── routes/                # Маршрути API (для майбутнього)
├── controllers/           # Контролери (для майбутнього)
├── models/                # Моделі даних (для майбутнього)
├── .env                   # Змінні середовища
├── .env.example           # Приклад змінних
├── .gitignore            # Git ignore
├── package.json          # NPM конфігурація
├── server.js             # Головний файл
└── README.md             # Документація
```

## 🎯 Як запустити

### Режим розробки (з автоматичним перезапуском)
```bash
cd backend
npm run dev
```

### Production режим
```bash
cd backend
npm start
```

## 🌐 Тестування API

Після запуску сервер буде доступний на `http://localhost:5000`

### Перевірка роботи
```bash
curl http://localhost:5000
```

Відповідь:
```json
{
  "success": true,
  "message": "EcoLviv API працює успішно! 🌱",
  "version": "1.0.0",
  "timestamp": "2025-10-22T19:14:49.123Z"
}
```

### Health Check
```bash
curl http://localhost:5000/health
```

## 🔧 Налаштування

### Змінні середовища (.env)

```env
# Сервер
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_characters
JWT_EXPIRE=30d

# CORS
FRONTEND_URL=http://localhost:3000

# База даних (буде додано пізніше)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=ecolv_db
```

## 📝 Що далі?

### Наступні кроки розробки:

1. **База даних**
   - Налаштування MySQL/PostgreSQL
   - Створення схеми БД
   - Міграції

2. **Автентифікація**
   - Реєстрація користувачів
   - Логін/логаут
   - JWT токени
   - Захищені маршрути

3. **API для районів**
   - GET /api/districts - список районів
   - GET /api/districts/:id - інформація про район
   - GET /api/districts/:id/air-quality - дані про якість повітря

4. **API для моніторингу**
   - GET /api/monitoring/current - поточні дані
   - GET /api/monitoring/history - історія
   - GET /api/monitoring/forecast - прогноз

5. **Користувацькі налаштування**
   - GET /api/users/profile - профіль
   - PUT /api/users/profile - оновлення профілю
   - GET /api/users/subscriptions - підписки на райони

6. **Сповіщення**
   - Email сповіщення
   - Telegram бот
   - Push notifications

7. **Інтеграції**
   - OpenWeather API
   - Google Maps API
   - Датчики якості повітря

## 🛡️ Безпека

- ✅ Helmet для HTTP заголовків
- ✅ CORS налаштування
- ✅ Валідація вхідних даних
- ✅ Обробка помилок
- 🔄 JWT автентифікація (в процесі)
- 🔄 Rate limiting (планується)

## 📚 Корисні функції

У файлі `utils/helpers.js` є такі функції:

- `calculateAQI()` - обчислення індексу якості повітря
- `getAQIStatus()` - статус якості повітря
- `formatDate()` - форматування дати
- `generateMockAirQualityData()` - генерація тестових даних
- `isValidEmail()` - валідація email
- `generateToken()` - генерація токенів

## 🐛 Debugging

При проблемах перевірте:
1. Чи встановлено всі залежності: `npm install`
2. Чи створено файл `.env`
3. Чи вільний порт 5000
4. Логи в консолі

## 📞 Контакти

Якщо виникнуть питання - звертайтесь!

---

**Статус:** ✅ Backend успішно ініціалізовано та готовий до розробки!
