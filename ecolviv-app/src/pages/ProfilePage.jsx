// src/pages/ProfilePage.jsx

import React, { useState } from 'react';
import { User, Bell, Settings, MapPin, AlertCircle, Car, Trees } from 'lucide-react';
import { getAQIStatus } from '../utils/helpers';

const ProfilePage = ({ 
  userData, 
  setUserData, 
  setIsLoggedIn, 
  setCurrentPage,
  districts 
}) => {
  const [localUserData, setLocalUserData] = useState(userData || {
    name: 'Користувач',
    email: 'user@example.com',
    notifications: { email: true, telegram: false },
    subscribedDistricts: [],
    notificationTime: '08:00'
  });

  const toggleDistrictSubscription = (districtId) => {
    const newSubscribed = localUserData.subscribedDistricts.includes(districtId)
      ? localUserData.subscribedDistricts.filter(id => id !== districtId)
      : [...localUserData.subscribedDistricts, districtId];
    
    setLocalUserData({ ...localUserData, subscribedDistricts: newSubscribed });
  };

  const saveSettings = () => {
    setUserData(localUserData);
    alert('✓ Налаштування успішно збережено!');
  };

  const handleLogout = () => {
    if (window.confirm('Ви впевнені, що хочете вийти?')) {
      setIsLoggedIn(false);
      setUserData(null);
      setCurrentPage('home');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <User className="text-blue-600" />
          Профіль користувача
        </h1>

        {/* Особиста інформація */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="text-gray-600" size={20} />
            Особиста інформація
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ім'я</label>
              <input
                type="text"
                value={localUserData.name}
                onChange={(e) => setLocalUserData({...localUserData, name: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={localUserData.email}
                onChange={(e) => setLocalUserData({...localUserData, email: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Налаштування сповіщень */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="text-blue-600" size={20} />
            Налаштування сповіщень
          </h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-semibold text-gray-800">Email сповіщення</div>
                <div className="text-sm text-gray-600">Отримувати щоденні звіти на пошту</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localUserData.notifications.email}
                  onChange={(e) => setLocalUserData({
                    ...localUserData,
                    notifications: {...localUserData.notifications, email: e.target.checked}
                  })}
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
                  checked={localUserData.notifications.telegram}
                  onChange={(e) => setLocalUserData({
                    ...localUserData,
                    notifications: {...localUserData.notifications, telegram: e.target.checked}
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Час отримання щоденного звіту
              </label>
              <select
                value={localUserData.notificationTime}
                onChange={(e) => setLocalUserData({...localUserData, notificationTime: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="07:00">07:00 - Рано вранці</option>
                <option value="08:00">08:00 - Ранок</option>
                <option value="09:00">09:00 - Початок дня</option>
                <option value="18:00">18:00 - Вечір</option>
                <option value="20:00">20:00 - Увечері</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2 text-blue-800 text-sm">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-2">Що ви отримуватимете:</strong>
                <ul className="space-y-1 text-blue-700">
                  <li>• Щоденні ранкові звіти про якість повітря</li>
                  <li>• Попередження при різкому погіршенні показників (AQI {'>'} 90)</li>
                  <li>• Рекомендації для активностей на свіжому повітрі</li>
                  <li>• Прогнози на день для вибраних районів</li>
                  <li>• Повідомлення про покращення якості повітря</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Підписка на райони */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="text-green-600" size={20} />
            Підписка на райони
          </h2>
          <p className="text-gray-600 mb-4">
            Оберіть райони, про які хочете отримувати сповіщення
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {districts.map(district => {
              const isSubscribed = localUserData.subscribedDistricts.includes(district.id);
              const status = getAQIStatus(district.baseAQI);
              
              return (
                <div
                  key={district.id}
                  onClick={() => toggleDistrictSubscription(district.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSubscribed 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 mb-1">{district.name}</div>
                      <div className="text-sm text-gray-600 mb-2">
                        Поточний AQI: <span className="font-bold" style={{ color: status.color }}>{district.baseAQI}</span>
                        <span className="ml-2 text-xs">({status.text})</span>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Car size={12} />
                          Трафік: {district.traffic}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Trees size={12} />
                          Дерева: {district.trees}%
                        </span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSubscribed ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
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
                Вибрано районів: <strong>{localUserData.subscribedDistricts.length}</strong> з {districts.length}
              </span>
              {localUserData.subscribedDistricts.length === 0 && (
                <span className="text-orange-600 text-xs">⚠ Оберіть хоча б один район</span>
              )}
              {localUserData.subscribedDistricts.length === districts.length && (
                <span className="text-green-600 text-xs">✓ Всі райони вибрані</span>
              )}
            </div>
          </div>
        </div>

        {/* Кнопки дій */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={saveSettings}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Settings size={20} />
            Зберегти зміни
          </button>
          <button
            onClick={handleLogout}
            className="sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Вийти з акаунту
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;