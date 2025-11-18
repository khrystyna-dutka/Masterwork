// src/components/Auth/Register.jsx

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';
import { useTranslation } from 'react-i18next';

const Register = ({ setCurrentPage }) => {
  const { register, error } = useAuth();
  const { t } = useTranslation();
  
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
      errors.email = t('auth.validation.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t('auth.validation.emailInvalid');
    }

    if (!formData.password) {
      errors.password = t('auth.validation.passwordRequired');
    } else if (formData.password.length < 6) {
      errors.password = t('auth.validation.passwordMinLength');
    } else if (!/\d/.test(formData.password)) {
      errors.password = t('auth.validation.passwordMustContainDigit');
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t('auth.validation.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordsDoNotMatch');
    }

    if (!formData.full_name) {
      errors.full_name = t('auth.validation.fullNameRequired');
    } else if (formData.full_name.length < 2) {
      errors.full_name = t('auth.validation.fullNameMinLength');
    }

    if (formData.phone && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(formData.phone)) {
      errors.phone = t('auth.validation.phoneInvalid');
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
        <h2>{t('auth.registerTitle')}</h2>
        <p className="auth-subtitle">
          {t('auth.registerSubtitle')}
        </p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="full_name">
              {t('auth.fullNameLabel')}
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={validationErrors.full_name ? 'error' : ''}
              placeholder={t('auth.fullNamePlaceholder')}
              disabled={loading}
            />
            {validationErrors.full_name && (
              <span className="field-error">{validationErrors.full_name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              {t('auth.emailLabel')}
              {' '}*
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={validationErrors.email ? 'error' : ''}
              placeholder={t('auth.emailPlaceholder')}
              disabled={loading}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              {t('auth.phoneLabel')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={validationErrors.phone ? 'error' : ''}
              placeholder={t('auth.phonePlaceholder')}
              disabled={loading}
            />
            {validationErrors.phone && (
              <span className="field-error">{validationErrors.phone}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              {t('auth.passwordLabel')} *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={validationErrors.password ? 'error' : ''}
              placeholder={t('auth.passwordPlaceholder')}
              disabled={loading}
            />
            {validationErrors.password && (
              <span className="field-error">{validationErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              {t('auth.confirmPasswordLabel')}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={validationErrors.confirmPassword ? 'error' : ''}
              placeholder={t('auth.passwordPlaceholder')}
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
            {loading ? t('auth.registerButtonLoading') : t('auth.registerButton')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {t('auth.alreadyHaveAccountText')}{' '}
            <button 
              onClick={() => setCurrentPage('login')}
              className="auth-link"
            >
              {t('auth.loginLink')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
