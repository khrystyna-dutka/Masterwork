// routes/authRoutes.js - Маршрути авторизації

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  handleValidationErrors
} = require('../middleware/validation');

// Публічні маршрути
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);

// Захищені маршрути (потребують токен)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, handleValidationErrors, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;