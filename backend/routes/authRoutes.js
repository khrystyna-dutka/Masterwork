// routes/authRoutes.js
const express = require('express');
const router = express.Router();

console.log('🔧 authRoutes.js завантажується...');

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

console.log('✅ authController завантажено:', { register, login, getProfile });

const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  handleValidationErrors
} = require('../middleware/validation');

console.log('✅ middleware завантажено');

// Публічні маршрути
router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);

console.log('✅ POST /register та POST /login маршрути зареєстровані');

// Захищені маршрути
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, handleValidationErrors, updateProfile);
router.put('/change-password', protect, changePassword);

console.log('✅ authRoutes повністю налаштовані');

module.exports = router;