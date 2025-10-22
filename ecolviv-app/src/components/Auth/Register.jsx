// src/components/Auth/Register.jsx

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Register = ({ setCurrentPage }) => {
  const { register, error } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email обов\'язковий';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Невірний формат email';
    }

    if (!formData.password) {
      errors.password = 'Пароль обов\'язковий';
    } else if (formData.password.length < 6) {
      errors.password = 'Пароль має містити мінімум 6 символів';
    } else if (!/\d/.test(formData.password)) {
      errors.password = 'Пароль має містити хоча б одну цифру';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Підтвердження пароля обов\'язкове';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Паролі не співпадають';
    }

    if (!formData.full_name) {
      errors.full_name = 'Повне ім\'я обов\'язкове';
    } else if (formData.full_name.length < 2) {
      errors.full_name = 'Ім\'я має містити мінімум 2 символи';
    }

    if (formData.phone && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(formData.phone)) {
      errors.phone = 'Невірний формат телефону';
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
    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);
    setLoading(false);

    if (result.success) {
      setCurrentPage('home');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Реєстрація в EcoLviv</h2>
        <p className="auth-subtitle">Створіть свій обліковий запис</p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="full_name">Повне ім'я *</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={validationErrors.full_name ? 'error' : ''}
              placeholder="Іван Іванов"
              disabled={loading}
            />
            {validationErrors.full_name && (
              <span className="field-error">{validationErrors.full_name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={validationErrors.email ? 'error' : ''}
              placeholder="example@email.com"
              disabled={loading}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Телефон (опціонально)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={validationErrors.phone ? 'error' : ''}
              placeholder="+380501234567"
              disabled={loading}
            />
            {validationErrors.phone && (
              <span className="field-error">{validationErrors.phone}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={validationErrors.password ? 'error' : ''}
              placeholder="••••••••"
              disabled={loading}
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Підтвердження пароля *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={validationErrors.confirmPassword ? 'error' : ''}
              placeholder="••••••••"
              disabled={loading}
            />
            {validationErrors.confirmPassword && (
              <span className="field-error">{validationErrors.confirmPassword}</span>
            )}
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Реєстрація...' : 'Зареєструватися'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Вже є акаунт?{' '}
            <button 
              onClick={() => setCurrentPage('login')}
              className="auth-link"
            >
              Увійти
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;