// middleware/validation.js - Валідація вхідних даних

const { body, validationResult } = require('express-validator');

// Правила валідації для реєстрації
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Введіть коректний email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль має містити мінімум 6 символів')
    .matches(/\d/)
    .withMessage('Пароль має містити хоча б одну цифру'),
  
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Ім\'я має містити від 2 до 255 символів')
    .matches(/^[а-яА-ЯёЁіІїЇєЄa-zA-Z\s'-]+$/)
    .withMessage('Ім\'я може містити тільки букви, пробіли, дефіс та апостроф'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage('Введіть коректний номер телефону')
];

// Правила валідації для логіну
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Введіть коректний email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Пароль обов\'язковий')
];

// Правила валідації для оновлення профілю
const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Ім\'я має містити від 2 до 255 символів'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage('Введіть коректний номер телефону')
];

// Middleware для обробки помилок валідації
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Помилка валідації',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  handleValidationErrors
};