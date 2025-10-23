// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { User, Bell, Settings, MapPin, Save, LogOut, Mail, Phone, Lock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAQIStatus } from '../utils/helpers';
import ChangePassword from '../components/ChangePassword';

const ProfilePage = ({ setCurrentPage, districts }) => {
  const { user, logout, updateProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    notification_preferences: {
      email: true,
      push: false,
      telegram: false
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [subscribedDistricts, setSubscribedDistricts] = useState([]);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handlePasswordChanged = () => {
    setSuccessMessage('Пароль успішно змінено!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Завантажуємо дані користувача
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        notification_preferences: user.notification_preferences || {
          email: true,
          push: false,
          telegram: false
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleNotification = (type) => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [type]: !prev.notification_preferences[type]
      }
    }));
  };

  const toggleDistrictSubscription = (districtId) => {
    setSubscribedDistricts(prev => 
      prev.includes(districtId)
        ? prev.filter(id => id !== districtId)
        : [...prev, districtId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    const result = await updateProfile(formData);

    setLoading(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Профіль успішно оновлено!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: result.message || 'Помилка при оновленні профілю' });
    }
  };

  const handleLogout = () => {
    if (window.confirm('Ви впевнені, що хочете вийти?')) {
      logout();
      setCurrentPage('home');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Будь ласка, увійдіть до системи</p>
          <button
            onClick={() => setCurrentPage('login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Увійти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <User className="text-blue-600" />
          Профіль користувача
        </h1>

        {/* Повідомлення */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Особиста інформація */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="text-gray-600" size={20} />
            Особиста інформація
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User size={16} />
                Повне ім'я
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Іван Іванов"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail size={16} />
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email не можна змінити</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone size={16} />
                Телефон (опціонально)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="+380501234567"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Роль:</strong> {user.role === 'admin' ? 'Адміністратор' : 'Користувач'}</p>
                {user.created_at && !isNaN(new Date(user.created_at)) && (
                  <p><strong>Дата реєстрації:</strong> {new Date(user.created_at).toLocaleDateString('uk-UA')}</p>
                )}
                {user.last_login && !isNaN(new Date(user.last_login)) && (
                  <p><strong>Останній вхід:</strong> {new Date(user.last_login).toLocaleString('uk-UA')}</p>
                )}
                <p>
                  <strong>Статус:</strong>{' '}
                  {user.is_verified ? (
                    <span className="text-green-600">✓ Верифікований</span>
                  ) : (
                    <span className="text-orange-600">Не верифікований</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Повідомлення про успіх */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 border border-green-300 rounded-lg flex items-center gap-2">
            <Check size={20} />
            {successMessage}
          </div>
        )}

        {/* Зміна пароля */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="text-gray-600" size={20} />
            Безпека
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-semibold text-gray-800">Пароль</div>
              <div className="text-sm text-gray-600">
                {user.password_changed_at 
                  ? `Останнє оновлення: ${new Date(user.password_changed_at).toLocaleDateString('uk-UA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}`
                  : 'Пароль не змінювався'
                }
              </div>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Lock size={16} />
              Змінити пароль
            </button>
          </div>
        </div>

        {/* Налаштування сповіщень */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="text-blue-600" size={20} />
            Налаштування сповіщень
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-semibold text-gray-800">Email сповіщення</div>
                <div className="text-sm text-gray-600">Отримувати щоденні звіти на пошту</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.email}
                  onChange={() => toggleNotification('email')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-semibold text-gray-800">Push сповіщення</div>
                <div className="text-sm text-gray-600">Миттєві сповіщення у браузері</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.push}
                  onChange={() => toggleNotification('push')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-semibold text-gray-800">Telegram бот</div>
                <div className="text-sm text-gray-600">Миттєві сповіщення у Telegram</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification_preferences.telegram}
                  onChange={() => toggleNotification('telegram')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Підписки на райони */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="text-green-600" size={20} />
            Мої райони
          </h2>
          
          <p className="text-gray-600 mb-4">
            Оберіть райони, за якими ви хочете отримувати сповіщення про якість повітря
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {districts.map(district => {
              const isSubscribed = subscribedDistricts.includes(district.id);
              const status = getAQIStatus(district.baseAQI);
              
              return (
                <div
                  key={district.id}
                  onClick={() => toggleDistrictSubscription(district.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    isSubscribed 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{district.name}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span 
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{ 
                            backgroundColor: status.color + '20',
                            color: status.color
                          }}
                        >
                          AQI: {district.baseAQI}
                        </span>
                        <span className="text-xs text-gray-500">
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSubscribed 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'border-gray-300'
                    }`}>
                      {isSubscribed && <span className="text-white text-sm font-bold">✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Вибрано районів: <strong>{subscribedDistricts.length}</strong> з {districts.length}
              </span>
              {subscribedDistricts.length === 0 && (
                <span className="text-orange-600 text-xs">⚠ Оберіть хоча б один район</span>
              )}
            </div>
          </div>
        </div>

        {/* Кнопки дій */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {loading ? 'Збереження...' : 'Зберегти зміни'}
          </button>
          <button
            onClick={handleLogout}
            className="sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            Вийти з акаунту
          </button>
        </div>
      </div>
      {/* Модальне вікно зміни пароля */}
      {showChangePassword && (
        <ChangePassword
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordChanged}
        />
      )}
    </div>
  );
};

export default ProfilePage;