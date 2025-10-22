// middleware/errorHandler.js - Обробка помилок

/**
 * Клас для кастомних помилок API
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware для обробки не знайдених маршрутів
 */
const notFound = (req, res, next) => {
  const error = new ApiError(`Маршрут ${req.originalUrl} не знайдено`, 404);
  next(error);
};

/**
 * Головний обробник помилок
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Внутрішня помилка сервера';

  // Логування помилок
  console.error('❌ Error:', {
    message: err.message,
    statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Помилки валідації
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // JWT помилки
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Невалідний токен';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Токен прострочений';
  }

  // Відповідь
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  ApiError,
  notFound,
  errorHandler
};
