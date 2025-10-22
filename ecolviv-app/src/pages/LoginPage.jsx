// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { Wind } from 'lucide-react';

const LoginPage = ({ setIsLoggedIn, setUserData, setCurrentPage }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = () => {
    // Валідація
    if (!email || !password) {
      alert('Будь ласка, заповніть всі поля');
      return;
    }

    if (!isLogin) {
      if (!name) {
        alert('Будь ласка, введіть ваше ім\'я');
        return;
      }
      if (password !== confirmPassword) {
        alert('Паролі не співпадають!');
        return;
      }
      if (password.length < 6) {
        alert('Пароль має містити мінімум 6 символів');
        return;
      }
    }

    // Успішний вхід/реєстрація
    setIsLoggedIn(true);
    setUserData({ 
      name: name || 'Користувач', 
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
            {isLogin ? 'Вхід до системи' : 'Реєстрація'}
          </h2>
          <p className="text-gray-600">EcoLviv - моніторинг якості повітря</p>
        </div>

        <div className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ім'я *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Введіть ваше ім'я"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
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
              Пароль *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
            {!isLogin && (
              <p className="text-xs text-gray-500 mt-1">Мінімум 6 символів</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Підтвердіть пароль *
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
            {isLogin ? 'Увійти' : 'Зареєструватися'}
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
            {isLogin 
              ? 'Немає акаунту? Зареєструватися' 
              : 'Вже є акаунт? Увійти'
            }
          </button>
        </div>

        {!isLogin && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            Реєструючись, ви погоджуєтесь з умовами використання та політикою конфіденційності
          </div>
        )}

        {/* Демо-доступ */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">
            Або використайте демо-доступ:
          </p>
          <button
            onClick={() => {
              setEmail('demo@ecolviv.ua');
              setPassword('demo123');
              if (!isLogin) setIsLogin(true);
            }}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
          >
            Заповнити демо-дані
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;