// middleware/auth.js - Перевірка JWT токенів

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const protect = async (req, res, next) => {
  let token;

  // Перевірка наявності токену в headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Отримання токену з header
      token = req.headers.authorization.split(' ')[1];

      // Верифікація токену
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Отримання користувача з БД
      const result = await query(
        'SELECT id, email, full_name, role, is_verified FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Користувача не знайдено'
        });
      }

      // Додаємо користувача до request
      req.user = result.rows[0];
      
      // Оновлюємо last_login
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [decoded.id]
      );

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        success: false,
        message: 'Не авторизовано, токен невалідний'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Не авторизовано, токен відсутній'
    });
  }
};

// Middleware для перевірки ролі адміністратора
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Роль ${req.user.role} не має доступу до цього ресурсу`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };