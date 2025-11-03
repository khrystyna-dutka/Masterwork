// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { User, Bell, MapPin, Save, LogOut, Mail, Lock, Check } from 'lucide-react';
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
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [subscribedDistricts, setSubscribedDistricts] = useState([]);
  const [initialSubscriptions, setInitialSubscriptions] = useState([]);

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

  // Завантаження підписок при завантаженні компонента
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoadingSubscriptions(false);
          return;
        }

        const response = await fetch('http://localhost:5000/api/subscriptions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const districtIds = data.data.subscriptions.map(sub => sub.district_id);
          setSubscribedDistricts(districtIds);
          setInitialSubscriptions(districtIds); // 🆕 Зберігаємо початковий стан
        }
      } catch (error) {
        console.error('Помилка завантаження підписок:', error);
      } finally {
        setLoadingSubscriptions(false);
      }
    };

    if (user) {
      loadSubscriptions();
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

    try {
      const token = localStorage.getItem('token');

      // 🆕 Перевіряємо чи змінились підписки
      const subscriptionsChanged = JSON.stringify([...subscribedDistricts].sort()) !==
        JSON.stringify([...initialSubscriptions].sort());

      // 🆕 Перевіряємо чи email сповіщення увімкнені
      const emailEnabled = formData.notification_preferences.email;

      console.log('📊 Статус змін:', {
        subscriptionsChanged,
        emailEnabled,
        before: initialSubscriptions,
        after: subscribedDistricts
      });

      // Оновлюємо профіль
      const profileResult = await updateProfile(formData);

      if (!profileResult.success) {
        setMessage({ type: 'error', text: profileResult.message || 'Помилка при оновленні профілю' });
        setLoading(false);
        return;
      }

      // Оновлюємо підписки на райони
      const subscriptionsResponse = await fetch('http://localhost:5000/api/subscriptions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          district_ids: subscribedDistricts,
          notify_daily_summary: emailEnabled, // 🆕 Використовуємо статус email
          notify_on_high_pollution: emailEnabled, // 🆕
          send_test_email: subscriptionsChanged && emailEnabled // 🆕 Тільки якщо змінились підписки І email увімкнено
        })
      });

      if (!subscriptionsResponse.ok) {
        setMessage({ type: 'error', text: 'Помилка при оновленні підписок' });
        setLoading(false);
        return;
      }

      const subscriptionsData = await subscriptionsResponse.json();

      // 🆕 Формуємо повідомлення залежно від ситуації
      let successText = '✅ Профіль успішно оновлено!';

      if (subscriptionsChanged && emailEnabled && subscriptionsData.emailSent) {
        successText = `✅ Профіль та підписки оновлено! 📧 Тестовий email відправлено на ${user.email}`;
      } else if (subscriptionsChanged && !emailEnabled) {
        successText = '✅ Профіль та підписки оновлено! ⚠️ Email сповіщення вимкнені.';
      } else if (subscribedDistricts.length > 0 && emailEnabled) {
        successText = '✅ Профіль оновлено! Email сповіщення будуть надходити щодня о 8:00.';
      } else if (!emailEnabled) {
        successText = '✅ Профіль оновлено! Email сповіщення вимкнені.';
      }

      setMessage({ type: 'success', text: successText });

      // 🆕 Оновлюємо початкові підписки після успішного збереження
      setInitialSubscriptions([...subscribedDistricts]);

      setTimeout(() => setMessage({ type: '', text: '' }), 5000);

    } catch (error) {
      console.error('Помилка збереження:', error);
      setMessage({ type: 'error', text: 'Помилка при збереженні даних' });
    } finally {
      setLoading(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Увійдіть, щоб переглянути профіль</p>
          <button
            onClick={() => setCurrentPage('login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Увійти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{user.full_name || 'Користувач'}</h1>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Вийти
            </button>
          </div>

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              {successMessage}
            </div>
          )}

          {message.text && (
            <div className={`mb-4 p-4 rounded-lg ${message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Особиста інформація */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Особиста інформація
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Повне ім'я
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введіть ваше ім'я"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Телефон
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+380"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">{user.email}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Email не можна змінити</p>
            </div>
          </div>
        </div>

        {/* Зміна пароля */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-6 h-6 text-blue-600" />
            Безпека
          </h2>

          {/* Інфо про останню зміну пароля */}
          {user.password_changed_at && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Останнє оновлення:</strong>{' '}
                {new Date(user.password_changed_at).toLocaleDateString('uk-UA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          {!showChangePassword ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Змінити пароль
            </button>
          ) : (
            <div>
              <ChangePassword
                onSuccess={handlePasswordChanged}
                onClose={() => setShowChangePassword(false)}
              />
            </div>
          )}
        </div>

        {/* Налаштування сповіщень */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Налаштування сповіщень
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-800">Email сповіщення</p>
                  <p className="text-sm text-gray-600">Отримувати щоденні звіти на пошту</p>
                </div>
              </div>
              <button
                onClick={() => toggleNotification('email')}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${formData.notification_preferences.email ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${formData.notification_preferences.email ? 'translate-x-7' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-600">Push сповіщення</p>
                  <p className="text-sm text-gray-500">Незабаром...</p>
                </div>
              </div>
              <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-300">
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <div>
                  <p className="font-semibold text-gray-600">Telegram бот</p>
                  <p className="text-sm text-gray-500">Незабаром...</p>
                </div>
              </div>
              <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-300">
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Підписки на райони */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Підписки на райони для email сповіщень
          </h2>

          {!formData.notification_preferences.email && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              ⚠️ Email сповіщення вимкнені. Увімкніть їх вище, щоб отримувати звіти.
            </div>
          )}

          {loadingSubscriptions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Завантаження підписок...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {districts.map(district => {
                const isSubscribed = subscribedDistricts.includes(district.id);
                const { color, status } = getAQIStatus(district.baseAQI);

                return (
                  <div
                    key={district.id}
                    onClick={() => toggleDistrictSubscription(district.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${isSubscribed
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-800">{district.name}</h3>
                      {isSubscribed && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="px-3 py-1 rounded-full text-sm font-semibold"
                        style={{ backgroundColor: color, color: 'white' }}
                      >
                        AQI: {district.baseAQI}
                      </div>
                      <span className="text-sm text-gray-600">{status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {subscribedDistricts.length > 0 && formData.notification_preferences.email && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Підказка:</strong> Ви отримуватимете щоденні email звіти о 8:00 ранку
                з інформацією про якість повітря в обраних районах ({subscribedDistricts.length} вибрано).
              </p>
            </div>
          )}
        </div>

        {/* Кнопка збереження */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all ${loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-105'
              }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Збереження...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Зберегти зміни
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;