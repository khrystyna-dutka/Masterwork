// src/components/ChangePassword.jsx

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import authService from '../services/authService';

const ChangePassword = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Очищаємо помилку для поля
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validate = () => {
    const errors = {};

    if (!formData.currentPassword) {
      errors.currentPassword = 'Поточний пароль обов\'язковий';
    }

    if (!formData.newPassword) {
      errors.newPassword = 'Новий пароль обов\'язковий';
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = 'Пароль має містити мінімум 6 символів';
    } else if (!/\d/.test(formData.newPassword)) {
      errors.newPassword = 'Пароль має містити хоча б одну цифру';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Підтвердження пароля обов\'язкове';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Паролі не співпадають';
    }

    if (formData.currentPassword && formData.newPassword && 
        formData.currentPassword === formData.newPassword) {
      errors.newPassword = 'Новий пароль має відрізнятися від поточного';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.changePassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (response.success) {
        // Оновлюємо дані користувача в AuthContext
        const profileResponse = await authService.getProfile();
        
        onSuccess?.();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(response.message || 'Помилка при зміні пароля');
      }
    } catch (err) {
      setError(err.message || 'Помилка при зміні пароля');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { strength: 0, label: '', color: '' },
      { strength: 1, label: 'Дуже слабкий', color: '#ef4444' },
      { strength: 2, label: 'Слабкий', color: '#f59e0b' },
      { strength: 3, label: 'Середній', color: '#f59e0b' },
      { strength: 4, label: 'Сильний', color: '#10b981' },
      { strength: 5, label: 'Дуже сильний', color: '#10b981' },
    ];

    return levels[strength];
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Lock className="text-blue-600" size={24} />
            Зміна пароля
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Поточний пароль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поточний пароль
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                  validationErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Введіть поточний пароль"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {validationErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.currentPassword}</p>
            )}
          </div>

          {/* Новий пароль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Новий пароль
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                  validationErrors.newPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Введіть новий пароль"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {validationErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.newPassword}</p>
            )}
            
            {/* Індикатор надійності пароля */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${(passwordStrength.strength / 5) * 100}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p className={formData.newPassword.length >= 6 ? 'text-green-600' : ''}>
                    {formData.newPassword.length >= 6 ? '✓' : '○'} Мінімум 6 символів
                  </p>
                  <p className={/\d/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    {/\d/.test(formData.newPassword) ? '✓' : '○'} Містить цифру
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Підтвердження пароля */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Підтвердження нового пароля
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                  validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Повторіть новий пароль"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
            )}
            {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
              <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                <Check size={16} /> Паролі співпадають
              </p>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Збереження...' : 'Змінити пароль'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;