import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import authService from '../services/authService';
import { useTranslation } from 'react-i18next';

const ChangePassword = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();

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

    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
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
      errors.currentPassword = t('changePassword.validation.currentRequired');
    }

    if (!formData.newPassword) {
      errors.newPassword = t('changePassword.validation.newRequired');
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = t('changePassword.validation.newMinLength');
    } else if (!/\d/.test(formData.newPassword)) {
      errors.newPassword = t('changePassword.validation.newDigit');
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t('changePassword.validation.confirmRequired');
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = t('changePassword.validation.notMatch');
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      errors.newPassword = t('changePassword.validation.mustDiffer');
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
        await authService.getProfile();
        onSuccess?.();

        setTimeout(() => onClose(), 1500);
      } else {
        setError(response.message || t('changePassword.errorGeneral'));
      }
    } catch (err) {
      setError(err.message || t('changePassword.errorGeneral'));
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
      { label: '', color: '' },
      { label: t('changePassword.strengthVeryWeak'), color: '#ef4444' },
      { label: t('changePassword.strengthWeak'), color: '#f59e0b' },
      { label: t('changePassword.strengthMedium'), color: '#f59e0b' },
      { label: t('changePassword.strengthStrong'), color: '#10b981' },
      { label: t('changePassword.strengthVeryStrong'), color: '#10b981' }
    ];

    return { strength, ...levels[strength] };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="text-blue-600" size={24} />
            {t('changePassword.title')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Current password */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('changePassword.currentPassword')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder={t('changePassword.placeholderCurrent')}
                className={`w-full px-4 py-2 pr-10 border rounded-lg ${validationErrors.currentPassword ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {validationErrors.currentPassword && (
              <p className="text-sm text-red-600">{validationErrors.currentPassword}</p>
            )}
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('changePassword.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder={t('changePassword.placeholderNew')}
                className={`w-full px-4 py-2 pr-10 border rounded-lg ${validationErrors.newPassword ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {validationErrors.newPassword && (
              <p className="text-sm text-red-600">{validationErrors.newPassword}</p>
            )}

            {/* Password strength */}
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
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
                    {formData.newPassword.length >= 6 ? '✓' : '○'} {t('changePassword.requireMinLength')}
                  </p>
                  <p className={/\d/.test(formData.newPassword) ? 'text-green-600' : ''}>
                    {/\d/.test(formData.newPassword) ? '✓' : '○'} {t('changePassword.requireDigit')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('changePassword.confirmPassword')}
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('changePassword.placeholderConfirm')}
                className={`w-full px-4 py-2 pr-10 border rounded-lg ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {validationErrors.confirmPassword && (
              <p className="text-sm text-red-600">{validationErrors.confirmPassword}</p>
            )}

            {formData.confirmPassword &&
              formData.newPassword === formData.confirmPassword && (
                <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                  <Check size={16} /> {t('changePassword.match')}
                </p>
              )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            >
              {t('changePassword.cancel')}
            </button>

            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              disabled={loading}
            >
              {loading ? t('changePassword.saving') : t('changePassword.save')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ChangePassword;
