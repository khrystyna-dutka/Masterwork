# EcoLviv Backend API

Backend API для системи моніторингу якості повітря у Львові

## 🚀 Технології

- **Node.js** - Runtime середовище
- **Express.js** - Web framework
- **JWT** - Автентифікація
- **Helmet** - Безпека
- **CORS** - Міжсайтові запити
- **Morgan** - Логування HTTP запитів

## 📦 Встановлення

1. Клонуйте репозиторій
2. Встановіть залежності:
```bash
npm install
```

3. Створіть файл `.env` на основі `.env.example`:
```bash
cp .env.example .env
```

4. Налаштуйте змінні середовища у файлі `.env`

## 🎯 Запуск

### Режим розробки (з автоматичним перезапуском)
```bash
npm run dev
```

### Продакшн режим
```bash
npm start
```

Сервер буде доступний за адресою: `http://localhost:5000`

## 📚 API Endpoints

### Базові маршрути

#### GET /
Перевірка роботи API
```json
{
  "success": true,
  "message": "EcoLviv API працює успішно! 🌱",
  "version": "1.0.0",
  "timestamp": "2025-10-22T12:00:00.000Z"
}
```

#### GET /health
Health check endpoint
```json
{
  "status": "OK",
  "uptime": 123.456,
  "timestamp": "2025-10-22T12:00:00.000Z"
}
```

## 📁 Структура проекту

```
backend/
├── config/          # Конфігураційні файли
│   └── config.js    # Основна конфігурація
├── node_modules/    # Залежності
├── .env             # Змінні середовища (не в git)
├── .env.example     # Приклад змінних середовища
├── .gitignore       # Git ignore файл
├── package.json     # NPM конфігурація
├── server.js        # Головний файл сервера
└── README.md        # Документація
```

## 🔐 Змінні середовища

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:3000
```

## 🛡️ Безпека

- Використовується Helmet для HTTP заголовків безпеки
- CORS налаштований для контролю доступу
- JWT для автентифікації
- Валідація вхідних даних

## 📝 Ліцензія

ISC

## 👨‍💻 Автор

EcoLviv Team
