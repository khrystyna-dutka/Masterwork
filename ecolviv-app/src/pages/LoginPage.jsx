// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { Wind } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LoginPage = ({ setIsLoggedIn, setUserData, setCurrentPage }) => {
  const { t } = useTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = () => {
    // Валідація
    if (!email || !password) {
      alert(t('login.alertFillAll'));
      return;
    }

    if (!isLogin) {
      if (!name) {
        alert(t('login.alertEnterName'));
        return;
      }
      if (password !== confirmPassword) {
        alert(t('login.alertPasswordsNotMatch'));
        return;
      }
      if (password.length < 6) {
        alert(t('login.alertPasswordShort'));
        return;
      }
    }

    // Успішний вхід/реєстрація
    setIsLoggedIn(true);
    setUserData({
      name: name || t('login.defaultUser'),
      email,
      notifications: {
        email: true,
        telegram: false
      },
      subscribedDistricts: [],
      notificationTime: '08:00'
    });
    setCurrentPage('profile');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Wind className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isLogin ? t('login.loginTitle') : t('login.registerTitle')}
          </h2>
          <p className="text-gray-600">{t('login.subtitle')}</p>
        </div>

        <div className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.nameLabel')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder={t('login.namePlaceholder')}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('login.emailLabel')} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('login.passwordLabel')} *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
            {!isLogin && (
              <p className="text-xs text-gray-500 mt-1">
                {t('login.passwordMinLength')}
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.confirmPasswordLabel')} *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition mt-6"
          >
            {isLogin ? t('login.loginBtn') : t('login.registerBtn')}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setName('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isLogin ? t('login.switchToRegister') : t('login.switchToLogin')}
          </button>
        </div>

        {!isLogin && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            {t('login.termsNotice')}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">
            {t('login.demoAccess')}
          </p>
          <button
            onClick={() => {
              setEmail('demo@ecolviv.ua');
              setPassword('demo123');
              if (!isLogin) setIsLogin(true);
            }}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            {t('login.fillDemoData')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
